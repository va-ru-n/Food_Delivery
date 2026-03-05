const express = require('express');
const {
  getMyRestaurant,
  updateMyRestaurantOpenStatus,
  updateMyRestaurantTimings,
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  getDeliveryPartnersForRestaurant,
  assignDeliveryPartnerToOrder,
  getRestaurantFoodItems,
  updateRestaurantFoodItemAvailability
} = require('../controllers/restaurantOwnerController');
const { protect, restaurantOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/my-restaurant', protect, restaurantOnly, getMyRestaurant);
router.patch('/my-restaurant/open-status', protect, restaurantOnly, updateMyRestaurantOpenStatus);
router.patch('/my-restaurant/timings', protect, restaurantOnly, updateMyRestaurantTimings);
router.get('/orders', protect, restaurantOnly, getRestaurantOrders);
router.patch('/orders/:id/status', protect, restaurantOnly, updateRestaurantOrderStatus);
router.get('/delivery-partners', protect, restaurantOnly, getDeliveryPartnersForRestaurant);
router.patch('/orders/:id/assign-delivery', protect, restaurantOnly, assignDeliveryPartnerToOrder);
router.get('/foods', protect, restaurantOnly, getRestaurantFoodItems);
router.patch('/foods/:id/availability', protect, restaurantOnly, updateRestaurantFoodItemAvailability);

module.exports = router;
