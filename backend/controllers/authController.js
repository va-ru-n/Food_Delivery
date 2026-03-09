const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const ensureDeliveryPartnerProfile = async (user) => {
  if (!user || user.role !== 'delivery') {
    return;
  }

  await DeliveryPartner.findOneAndUpdate(
    { userId: user._id },
    {
      $setOnInsert: {
        userId: user._id,
        status: 'available',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      },
      $set: {
        name: user.name,
        phone: user.phoneNumber || user.email || 'N/A'
      }
    },
    { upsert: true, new: true }
  );
};

const registerUser = async (req, res, next) => {
  try {
    const { name, phoneNumber, password } = req.body;

    if (!name || !phoneNumber || !password) {
      return res.status(400).json({ message: 'Name, phone number, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedPhoneNumber = String(phoneNumber).trim();
    if (!/^[0-9+\-\s]{8,15}$/.test(normalizedPhoneNumber)) {
      return res.status(400).json({ message: 'Valid phone number is required' });
    }

    const existingUser = await User.findOne({ phoneNumber: normalizedPhoneNumber });

    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      phoneNumber: normalizedPhoneNumber,
      password: hashedPassword
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { phoneNumber, email, password } = req.body;

    if (!password || (!phoneNumber && !email)) {
      return res.status(400).json({ message: 'Email or phone number and password are required' });
    }

    const normalizedPhoneNumber = String(phoneNumber || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (normalizedPhoneNumber && !/^[0-9+\-\s]{8,15}$/.test(normalizedPhoneNumber)) {
      return res.status(400).json({ message: 'Valid phone number is required' });
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const user = await User.findOne(
      normalizedEmail ? { email: normalizedEmail } : { phoneNumber: normalizedPhoneNumber }
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await ensureDeliveryPartnerProfile(user);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { phoneNumber, email } = req.body;
    if (!phoneNumber && !email) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    const normalizedPhoneNumber = String(phoneNumber || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (normalizedPhoneNumber && !/^[0-9+\-\s]{8,15}$/.test(normalizedPhoneNumber)) {
      return res.status(400).json({ message: 'Valid phone number is required' });
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const user = await User.findOne(
      normalizedEmail ? { email: normalizedEmail } : { phoneNumber: normalizedPhoneNumber }
    );

    if (!user) {
      return res.status(200).json({
        message: 'If an account exists for this handle, a reset code has been generated'
      });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      message: 'Reset code generated. It expires in 10 minutes.',
      resetCode
    });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { phoneNumber, email, code, newPassword } = req.body;
    if ((!phoneNumber && !email) || !code || !newPassword) {
      return res.status(400).json({ message: 'Email or phone number, code, and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedPhoneNumber = String(phoneNumber || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (normalizedPhoneNumber && !/^[0-9+\-\s]{8,15}$/.test(normalizedPhoneNumber)) {
      return res.status(400).json({ message: 'Valid phone number is required' });
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const user = await User.findOne(
      normalizedEmail ? { email: normalizedEmail } : { phoneNumber: normalizedPhoneNumber }
    );

    if (!user) {
      return res.status(400).json({ message: 'Invalid reset request' });
    }

    const now = new Date();
    if (!user.resetPasswordCode || !user.resetPasswordExpires || user.resetPasswordExpires < now) {
      return res.status(400).json({ message: 'Reset code is expired or invalid' });
    }

    if (String(code).trim() !== String(user.resetPasswordCode)) {
      return res.status(400).json({ message: 'Reset code is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(newPassword), salt);
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password reset successful. Please login.' });
  } catch (error) {
    return next(error);
  }
};

const createUserByAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    if (!['customer', 'admin', 'restaurant', 'delivery'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role
    });

    await ensureDeliveryPartnerProfile(user);

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    return next(error);
  }
};

const getRestaurantOwners = async (req, res, next) => {
  try {
    const owners = await User.find({ role: 'restaurant' })
      .select('_id name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(owners);
  } catch (error) {
    return next(error);
  }
};

const getDeliveryPartners = async (req, res, next) => {
  try {
    const partners = await User.find({ role: 'delivery' })
      .select('_id name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(partners);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  createUserByAdmin,
  getRestaurantOwners,
  getDeliveryPartners
};
