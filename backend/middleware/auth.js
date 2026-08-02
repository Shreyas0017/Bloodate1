const jwt = require('jsonwebtoken')
const prisma = require('../prismaClient')
const { isBlacklisted } = require('../utils/tokenBlacklist')

// JWT_SECRET must be set — server.js validates this on startup.
const JWT_SECRET = process.env.JWT_SECRET

/**
 * Authenticate a request by verifying its Bearer token.
 * Rejects blacklisted tokens (logged-out sessions) and invalid/expired JWTs.
 */
async function authenticate(req, res, next) {
  const auth = req.headers.authorization
  let token = null

  if (auth && auth.startsWith('Bearer ')) {
    token = auth.split(' ')[1]
  }

  // NOTE: query-param token extraction has been intentionally removed.
  // Tokens in query strings are logged in server access logs and browser
  // history, leaking credentials.

  if (!token) return res.status(401).json({ error: 'missing token' })

  // Reject tokens the user has already logged out with
  if (isBlacklisted(token)) {
    return res.status(401).json({ error: 'token revoked' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) return res.status(401).json({ error: 'invalid token' })
    req.user = { id: user.id, role: user.role, email: user.email, hospitalId: user.hospitalId || null }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' })
  }
}

/**
 * Restrict access to specific roles.
 * SUPER_ADMIN always passes regardless of the role requirement.
 *
 * @param {string|string[]} role - Allowed role(s)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' })
    const allowed = Array.isArray(role) ? role : [role]
    if (!allowed.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'forbidden' })
    }
    next()
  }
}

module.exports = { authenticate, requireRole }
