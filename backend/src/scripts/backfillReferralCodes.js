require('dotenv').config()
const { connectMongo } = require('../db/mongoose')
const User = require('../models/User')

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URI
  if (!uri) {
    console.error('Missing MONGODB_URI env')
    process.exit(1)
  }
  await connectMongo(uri, { maxRetries: 2 })
  const filter = { $or: [ { referralCode: { $exists: false } }, { referralCode: null }, { referralCode: '' } ] }
  const users = await User.find(filter).exec()
  console.log(`Found ${users.length} users missing referralCode`)
  let updated = 0
  for (const u of users) {
    try {
      // Pre-save hook will assign referralCode
      await u.save()
      updated++
      console.log(`Updated: ${u._id} => ${u.referralCode}`)
    } catch (e) {
      console.warn(`Failed for ${u._id}:`, e?.message)
    }
  }
  console.log(`Done. Updated ${updated} users.`)
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
