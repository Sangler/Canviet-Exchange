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
  const hasAddr = addr.street && addr.postalCode && addr.city && addr.country
  if (!hasAddr) return false
  if (!u.employmentStatus) return false
  return true
}

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const { dateOfBirth, address, employmentStatus, phone } = req.body

    // Basic validation for required fields
    if (!dateOfBirth) return res.status(400).json({ message: 'dateOfBirth is required' })
    if (!address || !address.street || !address.postalCode || !address.city || !address.country) {
      return res.status(400).json({ message: 'Complete address is required' })
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
    
    // Update phone if provided
    if (phone) {
      // Parse phone into countryCode and phoneNumber
      let countryCode = '';
      let phoneNumber = '';
      
      if (phone.startsWith('+84')) {
        countryCode = '+84';
        phoneNumber = phone.substring(3);
      } else if (phone.startsWith('+1')) {
        countryCode = '+1';
        phoneNumber = phone.substring(2);
      } else {
        // Default: extract digits and assume last 10 are phone number
        const digits = phone.replace(/\D/g, '');
        phoneNumber = digits.slice(-10);
        countryCode = '+1'; // Default country code
      }
      
      // Validate phoneNumber is exactly 10 digits
      if (phoneNumber.length !== 10) {
        return res.status(400).json({ message: 'Phone number must be exactly 10 digits' })
      }
      
      // Check if phone number is already in use by another user
      const exists = await User.findOne({ 
        'phone.phoneNumber': phoneNumber, 
        _id: { $ne: userId } 
      })
      if (exists) return res.status(409).json({ message: 'Phone number already in use' })
      
      user.phone = {
        countryCode,
        phoneNumber
      }
      user.phoneVerified = false // Reset verification when phone changes
    }
    
    user.updatedAt = new Date()

    await user.save()
    return res.json({ ok: true, complete: isProfileComplete(user), user: user.toJSON() })
  } catch (err) {
    console.error('Users.updateProfile error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
