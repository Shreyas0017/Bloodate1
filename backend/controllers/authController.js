const prisma = require('../prismaClient')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { isValidEmail, validatePassword } = require('../utils/validators')
const { blacklistToken } = require('../utils/tokenBlacklist')

// JWT_SECRET must be set — validated on server startup.
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '7d'

/**
 * Hash a refresh token before DB storage so that a database breach does not
 * directly expose usable tokens.
 */
function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function register(req, res) {
  const {
    name,
    email,
    password,
    dateOfBirth,
    parentName,
    phone,
    bloodType,
    gender,
    weight,
    address,
    city,
    state,
    zip,
    emergencyContactName,
    emergencyContactPhone,
    lastDonation
  } = req.body

  // ── Input validation ───────────────────────────────────────────────────────
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'valid email required' })
  }

  const pwError = validatePassword(password)
  if (pwError) return res.status(400).json({ error: pwError })

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'email already in use' })

    const passwordHash = await bcrypt.hash(password, 10)
    const safeName = (name || '').trim() || email.split('@')[0]

    let dob = null
    if (dateOfBirth) {
      dob = new Date(dateOfBirth)
      if (Number.isNaN(dob.getTime())) {
        return res.status(400).json({ error: 'invalid dateOfBirth' })
      }
    }

    let lastDonationDate = null
    if (lastDonation) {
      lastDonationDate = new Date(lastDonation)
      if (Number.isNaN(lastDonationDate.getTime())) {
        return res.status(400).json({ error: 'invalid lastDonation' })
      }
    }

    let parsedWeight = null
    if (weight !== undefined && weight !== null && weight !== '') {
      parsedWeight = parseFloat(weight)
      if (Number.isNaN(parsedWeight)) {
        return res.status(400).json({ error: 'invalid weight' })
      }
    }

    const donorData = {
      name: safeName,
      email,
      phone: phone || null,
      dateOfBirth: dob,
      parentName: parentName || null,
      bloodType: bloodType || null,
      gender: gender || null,
      weight: parsedWeight,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      lastDonation: lastDonationDate
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: name ? name.trim() : null, email, passwordHash, role: 'DONOR' }
      })
      const donor = await tx.donor.create({ data: { ...donorData, userId: user.id } })
      return { user, donor }
    })

    return res.json({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      donorId: result.donor.id
    })
  } catch (err) {
    console.error('[ERROR] register:', err)
    return res.status(500).json({ error: 'server error' })
  }
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN })
}

async function login(req, res) {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'invalid credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'invalid credentials' })

    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)

    // Store hashed refresh token — plaintext never persisted
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashRefreshToken(refreshToken) }
    })

    return res.json({ accessToken, refreshToken })
  } catch (err) {
    console.error('[ERROR] login:', err)
    return res.status(500).json({ error: 'server error' })
  }
}

async function refresh(req, res) {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' })
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })

    // Compare hashed version
    if (!user || hashRefreshToken(refreshToken) !== user.refreshToken) {
      return res.status(401).json({ error: 'invalid token' })
    }

    const accessToken = signAccessToken(user)
    const newRefresh = signRefreshToken(user)

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashRefreshToken(newRefresh) }
    })

    return res.json({ accessToken, refreshToken: newRefresh })
  } catch (err) {
    console.error('[ERROR] refresh:', err)
    return res.status(401).json({ error: 'invalid token' })
  }
}

/**
 * Logout — blacklists the current access token for its remaining lifetime so
 * it cannot be reused, and clears the refresh token from the database.
 */
async function logout(req, res) {
  try {
    const auth = req.headers.authorization
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.split(' ')[1]
      // Decode (don't verify — we just need the exp claim) to get the TTL
      const decoded = jwt.decode(token)
      if (decoded && decoded.exp) {
        blacklistToken(token, decoded.exp)
      }
    }

    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null }
      })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('[ERROR] logout:', err)
    return res.status(500).json({ error: 'server error' })
  }
}

module.exports = { register, login, refresh, logout }
