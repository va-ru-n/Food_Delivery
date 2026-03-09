const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const User = require('../models/User');
const Order = require('../models/Order');

const parseGeoLocation = (payload) => {
  if (payload?.geoLocation?.type === 'Point' && Array.isArray(payload.geoLocation.coordinates)) {
    const [longitude, latitude] = payload.geoLocation.coordinates.map(Number);
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      return { type: 'Point', coordinates: [longitude, latitude] };
    }
  }

  const latitude = Number(payload?.latitude);
  const longitude = Number(payload?.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { type: 'Point', coordinates: [longitude, latitude] };
  }

  return undefined;
};

const getRestaurants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(restaurants);
  } catch (error) {
    next(error);
  }
};

const getRestaurantById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id).populate('owner', 'name email');

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    return res.status(200).json(restaurant);
  } catch (error) {
    return next(error);
  }
};

const addRestaurant = async (req, res, next) => {
  try {
    const { name, image, description, location, ownerId } = req.body;

    if (!name || !image || !description || !location || !ownerId) {
      return res.status(400).json({ message: 'Name, image, description, location, and ownerId are required' });
    }

    const owner = await User.findOne({ _id: ownerId, role: 'restaurant' });
    if (!owner) {
      return res.status(400).json({ message: 'Valid restaurant owner is required' });
    }

    const geoLocation = parseGeoLocation(req.body);

    const restaurant = await Restaurant.create({
      name,
      image,
      description,
      location,
      owner: ownerId,
      ...(geoLocation ? { geoLocation } : {})
    });

    res.status(201).json(restaurant);
  } catch (error) {
    next(error);
  }
};

const getFoodItemsByRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const items = await FoodItem.find({ restaurantId }).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

const addFoodItem = async (req, res, next) => {
  try {
    const { name, price, quantity, image, category, restaurantId } = req.body;

    if (!name || !price || quantity === undefined || !image || !category || !restaurantId) {
      return res.status(400).json({ message: 'All food item fields are required' });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    const normalizedQuantity = String(quantity).trim();
    if (!normalizedQuantity) {
      return res.status(400).json({ message: 'Quantity is required' });
    }

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const foodItem = await FoodItem.create({
      name,
      price: Number(price),
      quantity: normalizedQuantity,
      image,
      category,
      restaurantId
    });

    res.status(201).json(foodItem);
  } catch (error) {
    next(error);
  }
};

const updateFoodItemQuantity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const normalizedQuantity = String(quantity || '').trim();
    if (!normalizedQuantity) {
      return res.status(400).json({ message: 'Quantity is required' });
    }

    const foodItem = await FoodItem.findById(id);
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    foodItem.quantity = normalizedQuantity;
    await foodItem.save();

    return res.status(200).json(foodItem);
  } catch (error) {
    return next(error);
  }
};

const deleteRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const [foodDeleteResult, orderDeleteResult] = await Promise.all([
      FoodItem.deleteMany({ restaurantId: restaurant._id }),
      Order.deleteMany({ restaurantId: restaurant._id })
    ]);

    await Restaurant.deleteOne({ _id: restaurant._id });

    return res.status(200).json({
      message: 'Restaurant and related data deleted successfully',
      deleted: {
        restaurantId: restaurant._id,
        foodItems: foodDeleteResult.deletedCount || 0,
        orders: orderDeleteResult.deletedCount || 0
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRestaurants,
  getRestaurantById,
  addRestaurant,
  getFoodItemsByRestaurant,
  addFoodItem,
  updateFoodItemQuantity,
  deleteRestaurant
};
