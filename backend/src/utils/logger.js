const fs = require('fs')
const path = require('path')

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs')
const LOG_FILE = process.env.LOG_FILE || 'app.log'
const LOG_PATH = path.join(LOG_DIR, LOG_FILE)

function ensureLogDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  } catch (e) {
    // ignore
  }
}

function line(level, message, meta) {
  const ts = new Date().toISOString()
  let metaStr = ''
  if (meta && Object.keys(meta).length) {
    try {
      metaStr = ` ${JSON.stringify(meta)}`
    } catch {
      metaStr = ' {"meta":"[unserializable]"}'
    }
  }
  return `${ts} [${level.toUpperCase()}] ${message}${metaStr}\n`
}

function append(level, message, err, meta) {
  ensureLogDir()
  let msg = message
  if (err) {
    if (err instanceof Error) {
      msg += ` | ${err.message}\n${err.stack}`
    } else {
      try {
        msg += ` | ${JSON.stringify(err)}`
      } catch {
        msg += ' | [unserializable error]'
      }
    }
  }
  const data = line(level, msg, meta)
  fs.appendFile(LOG_PATH, data, (e) => {
    if (e) {
      // As a last resort, log failure to append
      // eslint-disable-next-line no-console
      console.error('[Logger] failed to write log file:', e.message)
    }
  })
}

module.exports = {
  info(message) {
    // eslint-disable-next-line no-console
    console.log(message)
    append('info', message)
  },
  warn(message) {
    // eslint-disable-next-line no-console
    console.warn(message)
    append('warn', message)
  },
  error(message, err) {
    // eslint-disable-next-line no-console
    console.error(message)
    append('error', message, err)
  },
  // Meta variants
  infoMeta(message, meta) {
    // eslint-disable-next-line no-console
    console.log(message, meta)
    append('info', message, undefined, meta)
  },
  warnMeta(message, meta) {
    // eslint-disable-next-line no-console
    console.warn(message, meta)
    append('warn', message, undefined, meta)
  },
  errorMeta(message, err, meta) {
    // eslint-disable-next-line no-console
    console.error(message, meta)
    append('error', message, err, meta)
  },
}
