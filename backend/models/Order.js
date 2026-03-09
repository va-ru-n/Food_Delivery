const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    foodItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: (value) => !value || value.length === 2,
        message: 'Point coordinates must be [longitude, latitude]'
      }
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    items: {
      type: [orderItemSchema],
      required: true
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    deliveryAddress: {
      type: String,
      required: true
    },
    deliveryLocation: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      },
      accuracy: {
        type: Number,
        min: 0
      }
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveryAssignedAt: {
      type: Date
    },
    acceptedByDeliveryAt: {
      type: Date
    },
    deliveryPartnerLocation: pointSchema,
    acceptBy: {
      type: Date,
      required: true
    },
    restaurantAcceptedAt: {
      type: Date
    },
    rejectedAt: {
      type: Date
    },
    cancelReason: {
      type: String,
      trim: true
    },
    estimatedDeliveryMinutes: {
      type: Number,
      default: 35,
      min: 10,
      max: 180
    },
    pickedUpAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Preparing',
        'Assigned',
        'PickedUp',
        'OutForDelivery',
        'Delivered',
        'Rejected',
        'Cancelled'
      ],
      default: 'Pending'
    },
    deletedByUser: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: true }
  }
);

module.exports = mongoose.model('Order', orderSchema);
