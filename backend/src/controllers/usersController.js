const User = require('../models/User')

exports.me = async (req, res) => {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    return res.json({ user: user.toJSON(), complete: isProfileComplete(user) })
  } catch (err) {
    console.error('Users.me error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const { receiveTransferEmails, receiveNewEmails } = req.body || {}

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (typeof receiveTransferEmails === 'boolean') {
      user.receiveTransferEmails = receiveTransferEmails
    }
    if (typeof receiveNewEmails === 'boolean') {
      user.receiveNewEmails = receiveNewEmails
    }
    user.updatedAt = new Date()
    await user.save()
    return res.json({ ok: true, user: user.toJSON() })
  } catch (err) {
    console.error('Users.updatePreferences error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

exports.setPhone = async (req, res) => {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const { phone } = req.body || {}
    if (!phone) return res.status(400).json({ message: 'Phone required' })
    // ensure phone unique
    const exists = await User.findOne({ phone, _id: { $ne: userId } })
    if (exists) return res.status(409).json({ message: 'Phone already in use' })
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    user.phone = phone
    user.phoneVerified = false
    await user.save()
    return res.json({ ok:true, user: user.toJSON() })
  } catch (err) {
    console.error('Users.setPhone error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Helper to determine if the user's profile is complete
function isProfileComplete(u) {
  if (!u) return false
  if (!u.dateOfBirth) return false
  const addr = u.address || {}
  
  // For Vietnam, only street and country are required
  if (addr.country === 'Vietnam') {
    const hasAddr = addr.street && addr.country
    if (!hasAddr) return false
  } else {
    // For other countries, all fields are required
    const hasAddr = addr.street && addr.postalCode && addr.city && addr.country
    if (!hasAddr) return false
  }
  
  if (!u.employmentStatus) return false
  return true
}

exports.closeAccount = async (req, res) => {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // Delete all related data
    const Request = require('../models/Requests')
    
    // Delete all user's transfer requests
    await Request.deleteMany({ userId: userId })
    
    // Delete the user account
    await User.findByIdAndDelete(userId)
    
    console.log(`Account closed and all data deleted for user: ${userId}`)
    
    return res.json({ 
      ok: true, 
      message: 'Account and all associated data have been permanently deleted' 
    })
  } catch (err) {
    console.error('Users.closeAccount error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const { dateOfBirth, address, employmentStatus, phone, preferredName } = req.body

    // Basic validation for required fields
    if (!dateOfBirth) return res.status(400).json({ message: 'dateOfBirth is required' })
    
    // Address validation: For Vietnam, only street and country are required
    if (!address || !address.street || !address.country) {
      return res.status(400).json({ message: 'Street and country are required' })
    }
    
    // For non-Vietnam countries, validate all address fields
    if (address.country !== 'Vietnam') {
      if (!address.postalCode || !address.city) {
        return res.status(400).json({ message: 'Complete address is required (street, city, postal code, country)' })
      }
    }
    
    if (!employmentStatus) return res.status(400).json({ message: 'employmentStatus is required' })

    // Parse date
    const dob = new Date(dateOfBirth)
    if (isNaN(dob.getTime())) return res.status(400).json({ message: 'Invalid dateOfBirth' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.dateOfBirth = dob
    user.address = {
      street: String(address.street || ''),
      postalCode: String(address.postalCode || ''),
      city: String(address.city || ''),
      province: String(address.province || ''),
      country: String(address.country || ''),
    }
    user.employmentStatus = String(employmentStatus)
    // Save preferred name if provided (optional)
    if (typeof preferredName === 'string' && preferredName.trim().length > 0) {
      // limit length to 30 chars for safety
      user.preferredName = String(preferredName).trim().slice(0, 30)
    }
    
    // Phone number is saved during OTP verification, not here
    // Validate that phone is verified before allowing profile save
    if (!user.phoneVerified) {
      return res.status(400).json({ message: 'Phone number must be verified before continuing' });
    }
    
    user.updatedAt = new Date()

    await user.save()
    return res.json({ ok: true, complete: isProfileComplete(user), user: user.toJSON() })
  } catch (err) {
    console.error('Users.updateProfile error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    
    const user = await User.findById(userId)
      .select('referralCode referrals points')
      .populate('referrals', 'firstName lastName createdAt KYCStatus')
      .lean()
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    // Calculate stats
    const totalReferrals = user.referrals?.length || 0
    const verifiedReferrals = user.referrals?.filter(r => r.KYCStatus === 'verified').length || 0
    
    const frontendUrl = process.env.FRONTEND_URL
    
    return res.json({
      ok: true,
      referralCode: user.referralCode,
      shareLink: `${frontendUrl}/login?ref=${user.referralCode}`,
      stats: {
        totalReferrals,
        verifiedReferrals,
        points: user.points || 0
      },
      referrals: user.referrals?.map(r => ({
        name: `${r.firstName} ${r.lastName}`,
        joinedAt: r.createdAt,
        verified: r.KYCStatus === 'verified'
      })) || []
    })
  } catch (error) {
    console.error('Get referral stats error:', error)
    return res.status(500).json({ message: 'Error fetching referral stats' })
  }
}
