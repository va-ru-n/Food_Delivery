const express = require('express');
const {
  getRestaurants,
  getRestaurantById,
  addRestaurant,
  getFoodItemsByRestaurant,
  addFoodItem,
  updateFoodItemQuantity,
  deleteRestaurant
} = require('../controllers/restaurantController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);
router.post('/', protect, adminOnly, addRestaurant);
router.delete('/:id', protect, adminOnly, deleteRestaurant);
router.get('/:restaurantId/foods', getFoodItemsByRestaurant);
router.post('/foods', protect, adminOnly, addFoodItem);
router.patch('/foods/:id/quantity', protect, adminOnly, updateFoodItemQuantity);

module.exports = router;
