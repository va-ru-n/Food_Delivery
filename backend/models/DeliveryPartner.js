const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['available', 'busy'],
      default: 'available'
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    currentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  },
  { timestamps: true }
);

deliveryPartnerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
