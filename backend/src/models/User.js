const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  KYCStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  KyCDocumentUrl: { type: String },
  IDNumber: { type: String },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    sparse: true
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


