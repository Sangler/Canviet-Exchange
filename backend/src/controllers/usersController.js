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
