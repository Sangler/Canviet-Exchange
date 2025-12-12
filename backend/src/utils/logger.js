// Console-only logger: file writing removed

module.exports = {
  info(message) {
    // eslint-disable-next-line no-console
    console.log(message)
  },
  warn(message) {
    // eslint-disable-next-line no-console
    console.warn(message)
  },
  error(message, err) {
    // eslint-disable-next-line no-console
    console.error(message)
    if (err instanceof Error && err.stack) {
      // eslint-disable-next-line no-console
      console.error(err.stack)
    } else if (err) {
      try {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(err))
      } catch {
        // eslint-disable-next-line no-console
      }
    }
  },
  // Meta variants
  infoMeta(message, meta) {
    // eslint-disable-next-line no-console
    console.log(message, meta)
  },
  warnMeta(message, meta) {
    // eslint-disable-next-line no-console
    console.warn(message, meta)
  },
  errorMeta(message, err, meta) {
    // eslint-disable-next-line no-console
    console.error(message, meta)
    if (err instanceof Error && err.stack) {
      // eslint-disable-next-line no-console
      console.error(err.stack)
    } else if (err) {
      try {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(err))
      } catch {
        // eslint-disable-next-line no-console
      }
    }
  },
}
