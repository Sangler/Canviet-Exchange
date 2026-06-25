const mongoose = require('mongoose');

const AdminProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    
    // Profile info (visible to users)
    displayName: String,
    bio: {
      type: String,
      maxlength: 500,
      trim: true
    },
    avatar: String, // S3 URL
    
    // Verification & stats
    successfulTransfers: {
      type: Number,
      default: 0,
      min: 0
    },
    totalVolume: {
      type: Number,
      default: 0,
      min: 0
    },
    averageRating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5
    },
    responseTimeHours: {
      type: Number,
      default: 2 // Average hours to respond
    },
    
    // Availability
    isAvailable: {
      type: Boolean,
      default: true
    },
    availabilitySchedule: {
      monday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '21:00' }
      },
      tuesday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '21:00' }
      },
      wednesday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '21:00' }
      },
      thursday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '21:00' }
      },
      friday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '23:00' }
      },
      saturday: {
        start: { type: String, default: '10:00' },
        end: { type: String, default: '23:00' }
      },
      sunday: {
        start: { type: String, default: '10:00' },
        end: { type: String, default: '21:00' }
      }
    },
    
    // Min/max trade limits
    minTradeAmount: {
      type: Number,
      default: 50
    },
    maxTradeAmount: {
      type: Number,
      default: 10000
    },
    
    // Verification badge
    verificationBadge: {
      type: String,
      enum: ['none', 'verified', 'elite'],
      default: 'none'
    },
    
    // Contact
    email: String,
    phone: String,
    
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminProfile', AdminProfileSchema);
