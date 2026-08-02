/**
 * Shared validation helpers used across controllers and services.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate email format.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email)
}

/**
 * Enforce password complexity rules.
 * Returns an error string if invalid, or null if valid.
 *
 * Rules:
 *  - Minimum 8 characters
 *  - At least one lowercase letter
 *  - At least one uppercase letter
 *  - At least one digit
 *
 * @param {string} password
 * @returns {string|null}
 */
function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number'
  }
  return null
}

/**
 * Validate AI-parsed medical field values for physiological plausibility.
 * Returns an array of error strings (empty if all fields are valid).
 *
 * @param {object} data - Parsed medical report object
 * @returns {string[]}
 */
function validateMedicalData(data) {
  const errors = []

  if (data.hemoglobin != null && (data.hemoglobin < 0 || data.hemoglobin > 25)) {
    errors.push(`Invalid hemoglobin level: ${data.hemoglobin} (expected 0–25 g/dL)`)
  }

  if (data.systolicBP != null && (data.systolicBP < 40 || data.systolicBP > 300)) {
    errors.push(`Invalid systolic BP: ${data.systolicBP} (expected 40–300 mmHg)`)
  }

  if (data.diastolicBP != null && (data.diastolicBP < 20 || data.diastolicBP > 200)) {
    errors.push(`Invalid diastolic BP: ${data.diastolicBP} (expected 20–200 mmHg)`)
  }

  if (data.sugarLevel != null && (data.sugarLevel < 10 || data.sugarLevel > 1000)) {
    errors.push(`Invalid sugar level: ${data.sugarLevel} (expected 10–1000 mg/dL)`)
  }

  if (data.plateletCount != null && (data.plateletCount < 0 || data.plateletCount > 10000)) {
    errors.push(`Invalid platelet count: ${data.plateletCount}`)
  }

  if (data.wbcCount != null && (data.wbcCount < 0 || data.wbcCount > 1000)) {
    errors.push(`Invalid WBC count: ${data.wbcCount}`)
  }

  if (data.rbcCount != null && (data.rbcCount < 0 || data.rbcCount > 20)) {
    errors.push(`Invalid RBC count: ${data.rbcCount}`)
  }

  if (data.age != null && (data.age < 0 || data.age > 150)) {
    errors.push(`Invalid age: ${data.age}`)
  }

  if (data.reportDate) {
    const d = new Date(data.reportDate)
    if (isNaN(d.getTime())) {
      errors.push(`Invalid report date: ${data.reportDate}`)
    } else if (d > new Date()) {
      errors.push('Report date cannot be in the future')
    }
  }

  return errors
}

module.exports = { isValidEmail, validatePassword, validateMedicalData }
