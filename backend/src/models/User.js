const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  KYCStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  KyCDocumentUrl: { type: String, enum: ['ID Document', 'Driving license', 'Passport'] },
  IDNumber: { type: String },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    countryCode: { type: String },
    phoneNumber: { type: String, required: false, unique: true, sparse: true, maxlength: 10 }
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  //User profile fields
  dateOfBirth: { type: Date, default: null },
  address: {
    street: { type: String, lowercase: true },
    postalCode: { type: String, lowercase: true },
    city: { type: String, lowercase: true },
    province: { type: String, lowercase: true },
    country: { type: String, lowercase: true }
  },
  employmentStatus: { type: String },

  passwordHash: { type: String, required: true },
  emailVerified: {
    type: Boolean,
    default: false
  }, 

  phoneVerified: {
    type: Boolean,
    default: false
  },
  // ✅ Recommended additions
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  }, // to support role-based access
  /*
  // Referral code that this user can share
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  // Who referred this user
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // List of users this user has referred
  referrals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
*/
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Explicit indexes to ensure uniqueness constraints are created in MongoDB
userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ phone: 1 }, { unique: true, sparse: true })

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash
    return ret
  },
})

module.exports = mongoose.model('User', userSchema)


