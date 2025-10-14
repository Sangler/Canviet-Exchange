const User = require('../models/User')

exports.me = async (req, res) => {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    return res.json({ user: user.toJSON() })
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

exports.updateMe = async (req, res) => {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const {
      firstName,
      lastName,
      preferredName,
      dateOfBirth,
      phone,
      address,
      employmentStatus,
      country,
      state,
      city,
      postalCode,
      street,
    } = req.body || {}

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (typeof firstName === 'string' && firstName.trim()) user.firstName = firstName.trim()
    if (typeof lastName === 'string' && lastName.trim()) user.lastName = lastName.trim()
    if (typeof preferredName === 'string') user.preferredName = preferredName.trim()
    if (typeof employmentStatus === 'string') user.employmentStatus = employmentStatus.trim()

    // dateOfBirth can be ISO string or yyyy-mm-dd; validate parsable
    if (dateOfBirth) {
      const d = new Date(dateOfBirth)
      if (!isNaN(d.getTime())) user.dateOfBirth = d
    }

    // Phone uniqueness check if changed
    if (typeof phone === 'string') {
      const trimmed = phone.trim()
      if (trimmed && trimmed !== user.phone) {
        const exists = await User.findOne({ phone: trimmed, _id: { $ne: userId } })
        if (exists) return res.status(409).json({ message: 'Phone already in use' })
        user.phone = trimmed
        user.phoneVerified = false
      }
    }

    // Address: accept nested address or flat fields
    const addr = address || {}
    const nextAddress = {
      street: typeof (addr.street ?? street) === 'string' ? String(addr.street ?? street).trim() : user.address?.street,
      city: typeof (addr.city ?? city) === 'string' ? String(addr.city ?? city).trim() : user.address?.city,
      state: typeof (addr.state ?? state) === 'string' ? String(addr.state ?? state).trim() : user.address?.state,
      postalCode: typeof (addr.postalCode ?? postalCode) === 'string' ? String(addr.postalCode ?? postalCode).trim() : user.address?.postalCode,
      country: typeof (addr.country ?? country) === 'string' ? String(addr.country ?? country).trim() : user.address?.country,
    }
    user.address = { ...user.address, ...nextAddress }

    await user.save()
    return res.json({ ok: true, user: user.toJSON() })
  } catch (err) {
    console.error('Users.updateMe error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
