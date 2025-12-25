#!/usr/bin/env node
require('dotenv').config()
const { createTransport } = require('../services/email')

;(async () => {
  try {
    const transporter = createTransport()
    const ok = await transporter.verify()
    // console.log(JSON.stringify({ ok: !!ok, user: process.env.EMAIL_USER || process.env.emailUser, host: process.env.EMAIL_HOST || process.env.emailHost, port: Number(process.env.EMAIL_PORT || process.env.emailPort || 465) }))
    process.exit(0)
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e), user: process.env.EMAIL_USER || process.env.emailUser, host: process.env.EMAIL_HOST || process.env.emailHost }))
    process.exit(1)
  }
})()
