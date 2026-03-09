const express = require('express');
const {
  getMyAssignedOrders,
  acceptAssignedOrder,
  rejectAssignedOrder,
  updateDeliveryStatus,
  updateMyLocation
} = require('../controllers/deliveryController');
const { protect, deliveryOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/orders', protect, deliveryOnly, getMyAssignedOrders);
router.patch('/orders/:id/accept', protect, deliveryOnly, acceptAssignedOrder);
router.patch('/orders/:id/reject', protect, deliveryOnly, rejectAssignedOrder);
router.patch('/orders/:id/status', protect, deliveryOnly, updateDeliveryStatus);
router.patch('/location', protect, deliveryOnly, updateMyLocation);

module.exports = router;
