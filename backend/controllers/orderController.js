const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const Restaurant = require('../models/Restaurant');

const validAdminStatuses = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

const createOrder = async (req, res, next) => {
  try {
    const { items, totalAmount, deliveryAddress, phoneNumber, deliveryLocation } = req.body;

    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can place orders' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    if (!phoneNumber || !/^[0-9+\-\s]{8,15}$/.test(phoneNumber.trim())) {
      return res.status(400).json({ message: 'Valid phone number is required' });
    }

    let normalizedDeliveryLocation;
    if (deliveryLocation !== undefined) {
      if (typeof deliveryLocation !== 'object' || deliveryLocation === null) {
        return res.status(400).json({ message: 'Delivery location must be an object' });
      }

      const latitude = Number(deliveryLocation.latitude);
      const longitude = Number(deliveryLocation.longitude);
      const accuracy = deliveryLocation.accuracy !== undefined ? Number(deliveryLocation.accuracy) : undefined;

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({ message: 'Delivery location coordinates are invalid' });
      }

      if (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0)) {
        return res.status(400).json({ message: 'Delivery location accuracy is invalid' });
      }

      normalizedDeliveryLocation = { latitude, longitude };
      if (accuracy !== undefined) {
        normalizedDeliveryLocation.accuracy = accuracy;
      }
    }

    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return res.status(400).json({ message: 'Valid total amount is required' });
    }

    const foodIds = [...new Set(items.map((item) => String(item.foodItem)))];
    const foodItems = await FoodItem.find({ _id: { $in: foodIds } });

    if (foodItems.length !== foodIds.length) {
      return res.status(400).json({ message: 'One or more food items are invalid' });
    }

    const restaurantId = String(foodItems[0].restaurantId);
    const restaurant = await Restaurant.findById(restaurantId).select('isOpen name');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    if (restaurant.isOpen === false) {
      return res.status(400).json({ message: `${restaurant.name} is currently closed` });
    }

    const hasMixedRestaurants = foodItems.some((food) => String(food.restaurantId) !== restaurantId);
    if (hasMixedRestaurants) {
      return res.status(400).json({ message: 'All items in an order must be from the same restaurant' });
    }

    const foodMap = new Map(foodItems.map((food) => [String(food._id), food]));
    const normalizedItems = [];
    let computedTotal = 0;

    // Build secure order items from DB values to prevent client-side tampering.
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Each item quantity must be a positive integer' });
      }

      const food = foodMap.get(String(item.foodItem));
      if (food.availabilityStatus === 'Not Available') {
        return res.status(400).json({ message: `${food.name} is currently not available` });
      }

      const linePrice = food.price * quantity;
      computedTotal += linePrice;

      normalizedItems.push({
        foodItem: food._id,
        name: food.name,
        price: food.price,
        quantity
      });
    }

    if (Math.abs(computedTotal - totalAmount) > 0.01) {
      return res.status(400).json({ message: 'Total amount does not match order items' });
    }

    const order = await Order.create({
      userId: req.user._id,
      restaurantId,
      items: normalizedItems,
      totalAmount: computedTotal,
      deliveryAddress: deliveryAddress.trim(),
      phoneNumber: phoneNumber.trim(),
      ...(normalizedDeliveryLocation ? { deliveryLocation: normalizedDeliveryLocation } : {})
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id, deletedByUser: false })
      .populate('deliveryPartner', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!validAdminStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('restaurantId', 'name')
      .populate('deliveryPartner', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

const cancelOrderByUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can cancel orders' });
    }

    const order = await Order.findOne({ _id: id, userId: req.user._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }

    order.status = 'Cancelled';
    await order.save();

    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const hideOrderFromUserHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can update order history' });
    }

    const order = await Order.findOne({ _id: id, userId: req.user._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!['Delivered', 'Cancelled'].includes(order.status)) {
      return res.status(400).json({ message: 'Only delivered or cancelled orders can be removed from history' });
    }

    order.deletedByUser = true;
    await order.save();

    return res.status(200).json({ message: 'Order removed from your history' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  updateOrderStatus,
  getAllOrders,
  cancelOrderByUser,
  hideOrderFromUserHistory
};
