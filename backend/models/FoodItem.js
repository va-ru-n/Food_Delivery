const mongoose = require('mongoose');

const availabilityStatuses = ['Available', 'Not Available', 'Last Few', 'Trending', 'Fresh'];

const foodItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: String,
      required: true,
      trim: true,
      default: '0'
    },
    image: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    availabilityStatus: {
      type: String,
      enum: availabilityStatuses,
      default: 'Available'
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FoodItem', foodItemSchema);
