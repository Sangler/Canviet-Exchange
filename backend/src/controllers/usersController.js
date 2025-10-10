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
