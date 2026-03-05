const Order = require('../models/Order');

const getMyAssignedOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ deliveryPartner: req.user._id })
      .populate('userId', 'name email')
      .populate('restaurantId', 'name location')
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return next(error);
  }
};

const markOrderPickedUp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ _id: id, deliveryPartner: req.user._id })
      .populate('userId', 'name email')
      .populate('restaurantId', 'name location');

    if (!order) {
      return res.status(404).json({ message: 'Assigned order not found' });
    }

    if (!['Out for Delivery', 'Delivered'].includes(order.status)) {
      return res.status(400).json({ message: 'Order is not in delivery stage' });
    }

    if (!order.pickedUpAt) {
      order.pickedUpAt = new Date();
      await order.save();
    }

    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const markOrderDelivered = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ _id: id, deliveryPartner: req.user._id })
      .populate('userId', 'name email')
      .populate('restaurantId', 'name location');

    if (!order) {
      return res.status(404).json({ message: 'Assigned order not found' });
    }

    if (order.status !== 'Out for Delivery') {
      return res.status(400).json({ message: 'Only Out for Delivery orders can be marked delivered' });
    }

    if (!order.pickedUpAt) {
      order.pickedUpAt = new Date();
    }

    order.status = 'Delivered';
    order.deliveredAt = new Date();
    await order.save();

    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyAssignedOrders,
  markOrderPickedUp,
  markOrderDelivered
};
