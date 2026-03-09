const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const Restaurant = require('../models/Restaurant');
const { emitToRestaurant, broadcastOrderUpdated } = require('../socket/socketEmitter');
const { ACCEPTANCE_WINDOW_MS, scheduleOrderAcceptanceTimer, clearOrderTimer } = require('../services/orderTimerService');

const validAdminStatuses = [
  'Pending',
  'Preparing',
  'Assigned',
  'PickedUp',
  'OutForDelivery',
  'Delivered',
  'Rejected',
  'Cancelled'
];

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

    const acceptBy = new Date(Date.now() + ACCEPTANCE_WINDOW_MS);

    const order = await Order.create({
      userId: req.user._id,
      restaurantId,
      items: normalizedItems,
      totalAmount: computedTotal,
      deliveryAddress: deliveryAddress.trim(),
      phoneNumber: phoneNumber.trim(),
      acceptBy,
      ...(normalizedDeliveryLocation ? { deliveryLocation: normalizedDeliveryLocation } : {})
    });

    scheduleOrderAcceptanceTimer(order._id, acceptBy);

    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('restaurantId', 'name location')
      .populate('deliveryPartner', 'name email');

    const payload = populatedOrder.toObject();
    emitToRestaurant(restaurantId, 'newOrder', payload);
    broadcastOrderUpdated(payload);

    res.status(201).json(populatedOrder);
  } catch (error) {
    next(error);
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id, deletedByUser: false })
      .populate('restaurantId', 'name location')
      .populate('deliveryPartner', 'name email phoneNumber')
      .sort({ createdAt: -1 });

    const orderPromises = orders.map(async (order) => {
      const orderObj = order.toObject();
      if (order.deliveryPartner) {
        const DeliveryPartner = require('../models/DeliveryPartner');
        const deliveryPartnerProfile = await DeliveryPartner.findOne({ userId: order.deliveryPartner._id });
        if (deliveryPartnerProfile && deliveryPartnerProfile.location) {
          orderObj.deliveryPartnerLocation = deliveryPartnerProfile.location;
        }
      }
      return orderObj;
    });

    const populatedOrders = await Promise.all(orderPromises);
    res.status(200).json(populatedOrders);
  } catch (error) {
    next(error);
  }
};

const getOrderByIdForUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('restaurantId', 'name location geoLocation')
      .populate('deliveryPartner', 'name email phoneNumber');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (String(order.userId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    const orderObj = order.toObject();
    if (order.deliveryPartner) {
      const DeliveryPartner = require('../models/DeliveryPartner');
      const deliveryPartnerProfile = await DeliveryPartner.findOne({ userId: order.deliveryPartner._id });
      if (deliveryPartnerProfile && deliveryPartnerProfile.location) {
        orderObj.deliveryPartnerLocation = deliveryPartnerProfile.location;
      }
    }

    return res.status(200).json(orderObj);
  } catch (error) {
    return next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!validAdminStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(id)
      .populate('userId', 'name email')
      .populate('restaurantId', 'name location')
      .populate('deliveryPartner', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    if (status !== 'Pending') {
      clearOrderTimer(order._id);
    }
    await order.save();

    broadcastOrderUpdated(order.toObject());
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

    const orderPromises = orders.map(async (order) => {
      const orderObj = order.toObject();
      if (order.deliveryPartner) {
        const DeliveryPartner = require('../models/DeliveryPartner');
        const deliveryPartnerProfile = await DeliveryPartner.findOne({ userId: order.deliveryPartner._id });
        if (deliveryPartnerProfile && deliveryPartnerProfile.location) {
          orderObj.deliveryPartnerLocation = deliveryPartnerProfile.location;
        }
      }
      return orderObj;
    });

    const populatedOrders = await Promise.all(orderPromises);
    res.status(200).json(populatedOrders);
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

    const order = await Order.findOne({ _id: id, userId: req.user._id })
      .populate('restaurantId', 'name location')
      .populate('deliveryPartner', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }

    order.status = 'Cancelled';
    order.cancelReason = 'Cancelled by customer';
    await order.save();
    clearOrderTimer(order._id);

    broadcastOrderUpdated(order.toObject());

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

    if (!['Delivered', 'Cancelled', 'Rejected'].includes(order.status)) {
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
  getOrderByIdForUser,
  updateOrderStatus,
  getAllOrders,
  cancelOrderByUser,
  hideOrderFromUserHistory
};
