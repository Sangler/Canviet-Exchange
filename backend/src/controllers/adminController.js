const User = require('../models/User')

exports.listUsers = async (req, res) => {
  try {
    // Return limited fields for UI
    const users = await User.find({}, {
      firstName: 1,
      lastName: 1,
      email: 1,
      phone: 1,
      role: 1,
      createdAt: 1,
      updatedAt: 1,
      emailVerified: 1,
      phoneVerified: 1,
    }).sort({ createdAt: -1 }).lean()
    return res.json({ users })
  } catch (err) {
    // console.error('Admin.listUsers error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
