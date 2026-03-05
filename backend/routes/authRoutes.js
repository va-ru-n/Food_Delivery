const express = require('express');
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  createUserByAdmin,
  getRestaurantOwners,
  getDeliveryPartners
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/admin/users', protect, adminOnly, createUserByAdmin);
router.get('/admin/restaurant-owners', protect, adminOnly, getRestaurantOwners);
router.get('/admin/delivery-partners', protect, adminOnly, getDeliveryPartners);

module.exports = router;
