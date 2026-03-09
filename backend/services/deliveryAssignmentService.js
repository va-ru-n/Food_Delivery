const DeliveryPartner = require('../models/DeliveryPartner');

const normalizePoint = (longitude, latitude) => ({
  type: 'Point',
  coordinates: [Number(longitude), Number(latitude)]
});

const getAssignmentOriginPoint = ({ restaurant, order }) => {
  const restaurantCoords = restaurant?.geoLocation?.coordinates;
  if (Array.isArray(restaurantCoords) && restaurantCoords.length === 2) {
    return normalizePoint(restaurantCoords[0], restaurantCoords[1]);
  }

  if (
    Number.isFinite(order?.deliveryLocation?.longitude) &&
    Number.isFinite(order?.deliveryLocation?.latitude)
  ) {
    return normalizePoint(order.deliveryLocation.longitude, order.deliveryLocation.latitude);
  }

  return null;
};

const assignNearestAvailablePartner = async ({ order, restaurant }) => {
  const origin = getAssignmentOriginPoint({ restaurant, order });
  if (!origin) {
    return null;
  }

  const partner = await DeliveryPartner.findOne({
    status: 'available',
    location: {
      $near: {
        $geometry: origin,
        $maxDistance: 5000
      }
    }
  }).populate('userId', 'name email phoneNumber');

  if (!partner || !partner.userId) {
    return null;
  }

  partner.status = 'busy';
  partner.currentOrderId = order._id;
  await partner.save();

  order.deliveryPartner = partner.userId._id;
  order.deliveryAssignedAt = new Date();
  order.status = 'Assigned';
  await order.save();

  return {
    partner,
    order
  };
};

module.exports = {
  assignNearestAvailablePartner
};
