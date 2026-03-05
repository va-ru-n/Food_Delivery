const express = require('express');
const {
  getMyAssignedOrders,
  markOrderPickedUp,
  markOrderDelivered
} = require('../controllers/deliveryController');
const { protect, deliveryOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/orders', protect, deliveryOnly, getMyAssignedOrders);
router.patch('/orders/:id/pickup', protect, deliveryOnly, markOrderPickedUp);
router.patch('/orders/:id/delivered', protect, deliveryOnly, markOrderDelivered);

module.exports = router;
