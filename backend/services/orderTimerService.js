const Order = require('../models/Order');
const { broadcastOrderUpdated, emitToRestaurant } = require('../socket/socketEmitter');

const EXPECTED_TIMEOUT_MINS = 5;
const ACCEPTANCE_WINDOW_MS = EXPECTED_TIMEOUT_MINS * 60 * 1000;
const activeTimers = new Map();

const clearOrderTimer = (orderId) => {
  const key = String(orderId);
  const existing = activeTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    activeTimers.delete(key);
  }
};

const rejectIfExpired = async (orderId) => {
  clearOrderTimer(orderId);

  const order = await Order.findById(orderId)
    .populate('userId', 'name email')
    .populate('restaurantId', 'name location')
    .populate('deliveryPartner', 'name email');

  if (!order || order.status !== 'Pending') {
    return;
  }

  if (!order.acceptBy || order.acceptBy > new Date()) {
    return;
  }

  order.status = 'Rejected';
  order.rejectedAt = new Date();
  order.cancelReason = `Restaurant did not accept within ${EXPECTED_TIMEOUT_MINS} minutes`;
  await order.save();

  const payload = order.toObject();
  broadcastOrderUpdated(payload);
  emitToRestaurant(order.restaurantId?._id || order.restaurantId, 'orderExpired', payload);
};

const scheduleOrderAcceptanceTimer = (orderId, acceptBy) => {
  clearOrderTimer(orderId);

  const waitMs = new Date(acceptBy).getTime() - Date.now();
  if (waitMs <= 0) {
    rejectIfExpired(orderId).catch(() => { });
    return;
  }

  const timeoutRef = setTimeout(() => {
    rejectIfExpired(orderId).catch(() => { });
  }, waitMs);

  activeTimers.set(String(orderId), timeoutRef);
};

const initializePendingOrderTimers = async () => {
  const pendingOrders = await Order.find({ status: 'Pending' }).select('_id acceptBy').lean();

  pendingOrders.forEach((order) => {
    if (!order.acceptBy) return;
    scheduleOrderAcceptanceTimer(order._id, order.acceptBy);
  });
};

module.exports = {
  ACCEPTANCE_WINDOW_MS,
  scheduleOrderAcceptanceTimer,
  clearOrderTimer,
  initializePendingOrderTimers
};
