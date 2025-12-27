const User = require('../models/User')

module.exports = async function requirePhoneVerified(req, res, next) {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ ok:false, message:'Unauthorized' })
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ ok:false, message:'User not found' })
    if (user.phoneVerified) return next()
    return res.status(403).json({
      ok: false,
      code: 'PHONE_VERIFICATION_REQUIRED',
      message: 'Please verify your phone number to proceed.',
      hasPhone: !!user.phone,
    })
  } catch (e) {
    // console.error('requirePhoneVerified error', e)
    return res.status(500).json({ ok:false, message:'Internal server error' })
  }
}
