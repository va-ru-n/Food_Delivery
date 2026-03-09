const Order = require('../models/Order');
const DeliveryPartner = require('../models/DeliveryPartner');
const { broadcastOrderUpdated, emitToCustomer } = require('../socket/socketEmitter');

const DELIVERY_STATUS_FLOW = {
  Assigned: ['PickedUp'],
  PickedUp: ['OutForDelivery'],
  OutForDelivery: ['Delivered']
};

const ensureDeliveryPartnerProfile = async (user) => {
  const profile = await DeliveryPartner.findOneAndUpdate(
    { userId: user._id },
    {
      $setOnInsert: {
        userId: user._id,
        status: 'available',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      },
      $set: {
        name: user.name,
        phone: user.phoneNumber || user.email || 'N/A'
      }
    },
    { upsert: true, new: true }
  );

  return profile;
};

const getMyAssignedOrders = async (req, res, next) => {
  try {
    await ensureDeliveryPartnerProfile(req.user);

    const orders = await Order.find({ deliveryPartner: req.user._id })
      .populate('userId', 'name email')
      .populate('restaurantId', 'name location geoLocation')
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    return next(error);
  }
};

const acceptAssignedOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, deliveryPartner: req.user._id })
      .populate('userId', 'name email')
      .populate('restaurantId', 'name location geoLocation');

    if (!order) {
      return res.status(404).json({ message: 'Assigned order not found' });
    }

    if (order.status !== 'Assigned') {
      return res.status(400).json({ message: 'Only Assigned orders can be accepted by delivery partner' });
    }

    order.acceptedByDeliveryAt = new Date();
    await order.save();

    const profile = await ensureDeliveryPartnerProfile(req.user);
    profile.status = 'busy';
    profile.currentOrderId = order._id;
    await profile.save();

    const payload = order.toObject();
    broadcastOrderUpdated(payload);
    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const rejectAssignedOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, deliveryPartner: req.user._id })
      .populate('userId', 'name email')
      .populate('restaurantId', 'name location geoLocation');

    if (!order) {
      return res.status(404).json({ message: 'Assigned order not found' });
    }

    if (order.status !== 'Assigned') {
      return res.status(400).json({ message: 'Only Assigned orders can be rejected by delivery partner' });
    }

    order.deliveryPartner = null;
    order.deliveryAssignedAt = null;
    order.acceptedByDeliveryAt = null;
    order.status = 'Preparing';
    await order.save();

    const profile = await ensureDeliveryPartnerProfile(req.user);
    profile.status = 'available';
    profile.currentOrderId = null;
    await profile.save();

    const payload = order.toObject();
    broadcastOrderUpdated(payload);

    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ _id: id, deliveryPartner: req.user._id })
      .populate('userId', 'name email')
      .populate('restaurantId', 'name location geoLocation')
      .populate('deliveryPartner', 'name email phoneNumber');

    if (!order) {
      return res.status(404).json({ message: 'Assigned order not found' });
    }

    const nextAllowed = DELIVERY_STATUS_FLOW[order.status] || [];
    if (!nextAllowed.includes(status)) {
      return res.status(400).json({ message: `Invalid status change from ${order.status} to ${status}` });
    }

    order.status = status;

    if (status === 'PickedUp' && !order.pickedUpAt) {
      order.pickedUpAt = new Date();
    }

    if (status === 'Delivered') {
      order.deliveredAt = new Date();
      const profile = await ensureDeliveryPartnerProfile(req.user);
      profile.status = 'available';
      profile.currentOrderId = null;
      await profile.save();
    }

    await order.save();

    const payload = order.toObject();
    broadcastOrderUpdated(payload);
    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

const updateMyLocation = async (req, res, next) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({ message: 'Invalid latitude' });
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Invalid longitude' });
    }

    const profile = await ensureDeliveryPartnerProfile(req.user);
    profile.location = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    if (profile.status !== 'busy') {
      profile.status = 'available';
    }
    await profile.save();

    const activeOrder = await Order.findOne({
      deliveryPartner: req.user._id,
      status: { $in: ['Assigned', 'PickedUp', 'OutForDelivery'] }
    })
      .sort({ updatedAt: -1 })
      .populate('deliveryPartner', 'name email phoneNumber')
      .populate('restaurantId', 'name location geoLocation');

    if (activeOrder) {
      activeOrder.deliveryPartnerLocation = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
      await activeOrder.save();

      const locationPayload = {
        orderId: String(activeOrder._id),
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        updatedAt: new Date().toISOString()
      };

      emitToCustomer(activeOrder.userId, 'deliveryLocationUpdated', locationPayload);
      broadcastOrderUpdated(activeOrder.toObject());
    }

    return res.status(200).json({
      message: 'Location updated',
      location: profile.location
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyAssignedOrders,
  acceptAssignedOrder,
  rejectAssignedOrder,
  updateDeliveryStatus,
  updateMyLocation
};
