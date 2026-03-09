const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    geoLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    },
    openingTime: {
      type: String,
      default: '',
      trim: true
    },
    closingTime: {
      type: String,
      default: '',
      trim: true
    },
    isOpen: {
      type: Boolean,
      default: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

restaurantSchema.index({ geoLocation: '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
