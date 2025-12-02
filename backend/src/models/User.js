const mongoose = require('mongoose')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
  KYCStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  KYCReference: { type: String }, // Shufti Pro reference ID
  KYCDeclinedReason: { type: String }, // Reason if KYC was rejected
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
    addressLine2: { type: String, lowercase: true, required: false },
    postalCode: { type: String, lowercase: true },
    city: { type: String, lowercase: true },
    province: { type: String },
    country: { type: String, lowercase: true }
  },
  employmentStatus: { type: String },

  passwordHash: { type: String, required: false }, // Optional: OAuth users don't have passwords
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }, // Track auth method
  googleId: { type: String, unique: true, sparse: true }, // Google OAuth user ID
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
  
  // Referral code that this user can share
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    maxLength:10
  },

  // Who referred this user
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    required: false
  },

  // List of users this user has referred
  referrals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  points: { type: Number, default: 0 }, // reward points for referrals

  // Privacy-preserving unique identity fingerprint derived from verified KYC fields
  identityKey: { type: String, sparse: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Explicit indexes to ensure uniqueness constraints are created in MongoDB
userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ 'phone.phoneNumber': 1 }, { unique: true, sparse: true })
userSchema.index({ googleId: 1 }, { unique: true, sparse: true })
// Enforce one verified identity = one account
userSchema.index(
  { identityKey: 1 },
  {
    name: 'identityKey_verified_unique',
    unique: true,
    partialFilterExpression: { KYCStatus: 'verified', identityKey: { $type: 'string' } }
  }
)

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash
    return ret
  },
})

// ---------- Helpers & Hooks ----------
function generateReferralCode(bytes = 10) {
  // Base32-like uppercase code without ambiguous chars
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // exclude I, O, 0, 1
  const buf = crypto.randomBytes(bytes)
  let code = ''
  for (let i = 0; i < buf.length; i++) {
    code += alphabet[buf[i] % alphabet.length]
  }
  return code
}

userSchema.pre('save', async function (next) {
  try {
    // Keep updatedAt fresh
    this.updatedAt = new Date()

    // Auto-generate referralCode if missing
    if (!this.referralCode) {
      let attempts = 0
      while (attempts < 5) {
        const candidate = generateReferralCode(10) // ~10 chars
        const exists = await this.constructor.findOne({ referralCode: candidate }).lean().exec()
        if (!exists) {
          this.referralCode = candidate
          break
        }
        attempts += 1
      }
      if (!this.referralCode) {
        // Fallback to timestamp-based suffix if collisions persist
        this.referralCode = `${generateReferralCode(4)}${Date.now().toString().slice(-4)}`
      }
    }

    return next()
  } catch (e) {
    return next(e)
  }
})

module.exports = mongoose.model('User', userSchema)


