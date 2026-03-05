const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, token missing' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

const restaurantOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'restaurant') {
    return res.status(403).json({ message: 'Restaurant owner access required' });
  }

  next();
};

const deliveryOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'delivery') {
    return res.status(403).json({ message: 'Delivery partner access required' });
  }

  next();
};

module.exports = { protect, adminOnly, restaurantOnly, deliveryOnly };
