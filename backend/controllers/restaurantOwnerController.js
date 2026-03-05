const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const User = require('../models/User');

const transitions = {
  Pending: 'Preparing',
  Preparing: null,
  'Out for Delivery': null,
  Delivered: null
};

const validAvailabilityStatuses = ['Available', 'Not Available', 'Last Few', 'Trending', 'Fresh'];
const time24Pattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const time12Pattern = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i;

const normalizeTimeTo12Hour = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const match12 = trimmed.match(time12Pattern);
  if (match12) {
    const hour = Number(match12[1]);
    const minute = match12[2];
    const period = match12[3].toUpperCase();
    return `${String(hour).padStart(2, '0')}:${minute} ${period}`;
  }

  const match24 = trimmed.match(time24Pattern);
  if (match24) {
    const hour24 = Number(match24[1]);
    const minute = match24[2];
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${minute} ${period}`;
  }

  return null;
};

const getMyRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id }).populate('owner', 'name email');

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    return res.status(200).json(restaurant);
  } catch (error) {
    return next(error);
  }
};

const updateMyRestaurantOpenStatus = async (req, res, next) => {
  try {
    const { isOpen } = req.body;

    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({ message: 'isOpen must be true or false' });
    }

    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    restaurant.isOpen = isOpen;
    await restaurant.save();

    return res.status(200).json(restaurant);
  } catch (error) {
    return next(error);
  }
};

const updateMyRestaurantTimings = async (req, res, next) => {
  try {
    const { openingTime, closingTime } = req.body;

    if (!openingTime || !closingTime) {
      return res.status(400).json({ message: 'openingTime and closingTime are required' });
    }

    const normalizedOpeningTime = normalizeTimeTo12Hour(openingTime);
    const normalizedClosingTime = normalizeTimeTo12Hour(closingTime);
    if (!normalizedOpeningTime || !normalizedClosingTime) {
      return res.status(400).json({ message: 'Use time format like 09:30 AM or 21:30' });
    }

    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    restaurant.openingTime = normalizedOpeningTime;
    restaurant.closingTime = normalizedClosingTime;
    await restaurant.save();

    return res.status(200).json(restaurant);
  } catch (error) {
    return next(error);
  }
};

const getRestaurantOrders = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    const orders = await Order.find({ restaurantId: restaurant._id })
      .populate('userId', 'name email')
      .populate('deliveryPartner', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return next(error);
  }
};

const updateRestaurantOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    const order = await Order.findOne({ _id: id, restaurantId: restaurant._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found for your restaurant' });
    }

    const nextAllowedStatus = transitions[order.status];
    if (!nextAllowedStatus) {
      return res.status(400).json({
        message: order.status === 'Preparing'
          ? 'Assign a delivery partner to move this order to Out for Delivery'
          : `Order is ${order.status} and cannot be updated here`
      });
    }

    if (status !== nextAllowedStatus) {
      return res.status(400).json({
        message: `Invalid status change. You can only move from ${order.status} to ${nextAllowedStatus}`
      });
    }

    order.status = status;
    await order.save();

    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const getDeliveryPartnersForRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    const partners = await User.find({ role: 'delivery' })
      .select('_id name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(partners);
  } catch (error) {
    return next(error);
  }
};

const assignDeliveryPartnerToOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryPartnerId } = req.body;

    if (!deliveryPartnerId) {
      return res.status(400).json({ message: 'deliveryPartnerId is required' });
    }

    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    const order = await Order.findOne({ _id: id, restaurantId: restaurant._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found for your restaurant' });
    }

    if (order.status !== 'Preparing') {
      return res.status(400).json({ message: 'Only Preparing orders can be assigned to delivery partners' });
    }

    const partner = await User.findOne({ _id: deliveryPartnerId, role: 'delivery' }).select('_id name email');
    if (!partner) {
      return res.status(400).json({ message: 'Valid delivery partner is required' });
    }

    order.deliveryPartner = partner._id;
    order.deliveryAssignedAt = new Date();
    order.pickedUpAt = null;
    order.deliveredAt = null;
    order.status = 'Out for Delivery';
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('deliveryPartner', 'name email');

    return res.status(200).json(populatedOrder);
  } catch (error) {
    return next(error);
  }
};

const getRestaurantFoodItems = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    const items = await FoodItem.find({ restaurantId: restaurant._id }).sort({ createdAt: -1 });
    return res.status(200).json(items);
  } catch (error) {
    return next(error);
  }
};

const updateRestaurantFoodItemAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { availabilityStatus } = req.body;

    if (!validAvailabilityStatuses.includes(availabilityStatus)) {
      return res.status(400).json({
        message: `Invalid availability status. Allowed values: ${validAvailabilityStatuses.join(', ')}`
      });
    }

    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    const item = await FoodItem.findOne({ _id: id, restaurantId: restaurant._id });
    if (!item) {
      return res.status(404).json({ message: 'Food item not found for your restaurant' });
    }

    item.availabilityStatus = availabilityStatus;
    await item.save();

    return res.status(200).json(item);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyRestaurant,
  updateMyRestaurantOpenStatus,
  updateMyRestaurantTimings,
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  getDeliveryPartnersForRestaurant,
  assignDeliveryPartnerToOrder,
  getRestaurantFoodItems,
  updateRestaurantFoodItemAvailability
};
