let io;

const ensureSocketReady = () => {
  if (!io) {
    throw new Error('Socket server is not initialized');
  }
};

const toId = (value) => (value ? String(value) : '');

const emitToRestaurant = (restaurantId, event, payload) => {
  if (!io || !restaurantId) return;
  io.to(`restaurant:${toId(restaurantId)}`).emit(event, payload);
};

const emitToCustomer = (customerId, event, payload) => {
  if (!io || !customerId) return;
  io.to(`customer:${toId(customerId)}`).emit(event, payload);
};

const emitToDelivery = (deliveryUserId, event, payload) => {
  if (!io || !deliveryUserId) return;
  io.to(`delivery:${toId(deliveryUserId)}`).emit(event, payload);
};

const broadcastOrderUpdated = (orderPayload) => {
  if (!io || !orderPayload) return;

  emitToRestaurant(orderPayload.restaurantId, 'orderUpdated', orderPayload);
  emitToCustomer(orderPayload.userId, 'orderUpdated', orderPayload);
  if (orderPayload.deliveryPartner) {
    emitToDelivery(orderPayload.deliveryPartner, 'orderUpdated', orderPayload);
  }
};

const setSocketInstance = (instance) => {
  io = instance;
};

const getSocketInstance = () => {
  ensureSocketReady();
  return io;
};

module.exports = {
  setSocketInstance,
  getSocketInstance,
  emitToRestaurant,
  emitToCustomer,
  emitToDelivery,
  broadcastOrderUpdated
};
