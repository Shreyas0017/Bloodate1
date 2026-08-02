/**
 * In-memory JWT access-token blacklist.
 *
 * When a user logs out, their current access token is added here with a TTL
 * equal to the remaining lifetime of the token.  The auth middleware checks
 * this list before accepting any request.
 *
 * Note: This implementation is intentionally lightweight — it lives in
 * process memory and resets on server restart.  For multi-instance deployments
 * replace this module with a Redis-backed equivalent.
 */

/** @type {Map<string, number>} token → unix-expiry-seconds */
const blacklist = new Map()

// Periodically sweep expired entries so the Map does not grow unbounded.
// Runs every 5 minutes.
setInterval(() => {
  const now = Math.floor(Date.now() / 1000)
  for (const [token, exp] of blacklist) {
    if (exp <= now) blacklist.delete(token)
  }
}, 5 * 60 * 1000).unref() // .unref() so this timer does not keep the process alive

/**
 * Add a token to the blacklist.
 * @param {string} token   - Raw JWT string
 * @param {number} expUnix - Unix timestamp (seconds) when the token expires
 */
function blacklistToken(token, expUnix) {
  if (!token || !expUnix) return
  blacklist.set(token, expUnix)
}

/**
 * Check whether a token has been blacklisted.
 * @param {string} token
 * @returns {boolean}
 */
function isBlacklisted(token) {
  if (!blacklist.has(token)) return false
  const exp = blacklist.get(token)
  const now = Math.floor(Date.now() / 1000)
  if (exp <= now) {
    blacklist.delete(token) // lazy cleanup
    return false
  }
  return true
}

module.exports = { blacklistToken, isBlacklisted }
