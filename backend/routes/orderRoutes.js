const express = require('express');
const {
  createOrder,
  getUserOrders,
  getOrderByIdForUser,
  updateOrderStatus,
  getAllOrders,
  cancelOrderByUser,
  hideOrderFromUserHistory
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/mine', protect, getUserOrders);
router.get('/mine/:id', protect, getOrderByIdForUser);
router.patch('/:id/cancel', protect, cancelOrderByUser);
router.patch('/:id/hide', protect, hideOrderFromUserHistory);
router.get('/', protect, adminOnly, getAllOrders);
router.patch('/:id/status', protect, adminOnly, updateOrderStatus);

module.exports = router;
