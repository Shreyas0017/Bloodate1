const { GoogleGenAI } = require('@google/genai')

let ai = null
let aiHealthy = false

if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  // Validate API key on startup with a lightweight probe.
  // If it fails we fall back to regex parsing for all subsequent calls.
  ai.models.list()
    .then(() => {
      aiHealthy = true
      console.log('✓ Gemini AI connected')
    })
    .catch((err) => {
      console.error('✗ Gemini AI connection failed:', err.message)
      console.warn('WARNING: AI parsing will use fallback regex method for all reports')
    })
} else {
  console.warn('WARNING: GEMINI_API_KEY not set — using regex parser only')
}

const EXTRACTION_PROMPT = `You are a medical report data extraction AI. Extract health data from the following OCR text of a medical/lab report.

Return a JSON object with EXACTLY these fields (use null if not found):

{
  "patientName": "string or null",
  "age": number or null,
  "gender": "Male" | "Female" | "Other" | null,
  "bloodGroup": "string like A+, O-, B+, AB+ etc or null",
  "hemoglobin": number in g/dL or null,
  "systolicBP": number or null,
  "diastolicBP": number or null,
  "sugarLevel": number in mg/dL or null,
  "plateletCount": number in thousands/µL or null,
  "wbcCount": number in thousands/µL or null,
  "rbcCount": number in millions/µL or null,
  "hivStatus": "Negative" | "Positive" | "Non-Reactive" | "Reactive" | null,
  "hepatitisStatus": "Negative" | "Positive" | "Non-Reactive" | "Reactive" | null,
  "malariaStatus": "Negative" | "Positive" | null,
  "reportDate": "YYYY-MM-DD or null",
  "labName": "string or null",
  "confidence": number 0-100 (your confidence in the extraction accuracy)
}

Important rules:
- Extract values even from messy, unstructured text
- Normalize blood pressure: if you see "120/80", systolicBP=120, diastolicBP=80
- Normalize units: hemoglobin should be in g/dL, sugar in mg/dL
- For HIV/Hepatitis: "Non-Reactive" = "Negative", "Reactive" = "Positive"
- For dates: convert any format to YYYY-MM-DD
- If multiple values exist for the same field, use the most recent one
- Return ONLY the JSON object, no markdown formatting`

/**
 * Parse medical report text using Gemini.
 * Falls back to regex if AI is unavailable or the call times out.
 * @param {string} rawText - OCR-extracted text
 * @returns {object} Parsed medical data
 */
async function parseReportWithAI(rawText) {
  if (!ai || !aiHealthy) {
    console.warn('AI unavailable, using regex fallback')
    return parseReportWithRegex(rawText)
  }

  // 45-second hard timeout — prevents hanging indefinitely on slow/unresponsive API
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI_TIMEOUT')), 45000)
  )

  const parsePromise = ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${EXTRACTION_PROMPT}\n\nExtract medical data from this report text:\n\n${rawText.substring(0, 8000)}`,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  })

  try {
    const response = await Promise.race([parsePromise, timeoutPromise])
    const content = response.text
    if (!content) throw new Error('Empty AI response')

    const parsed = JSON.parse(content)
    return {
      ...parsed,
      confidence: parsed.confidence || 70,
      method: 'ai'
    }
  } catch (err) {
    if (err.message === 'AI_TIMEOUT') {
      console.warn('AI parsing timed out after 45s — falling back to regex')
    } else {
      console.error('AI parsing failed, falling back to regex:', err.message)
    }
    return parseReportWithRegex(rawText)
  }
}

/**
 * Fallback regex-based parser for when Gemini is unavailable.
 */
function parseReportWithRegex(text) {
  const t = text || ''
  const upper = t.toUpperCase()

  const findNumber = (patterns) => {
    for (const p of patterns) {
      const m = t.match(p)
      if (m) return parseFloat(m[1])
    }
    return null
  }

  const findString = (patterns) => {
    for (const p of patterns) {
      const m = t.match(p)
      if (m) return m[1].trim()
    }
    return null
  }

  // Hemoglobin
  const hemoglobin = findNumber([
    /h(?:ae)?moglobin[:\s]*(\d+\.?\d*)/i,
    /hgb[:\s]*(\d+\.?\d*)/i,
    /hb[:\s]*(\d+\.?\d*)/i
  ])

  // Blood pressure
  const bpMatch = t.match(/(\d{2,3})\s*\/\s*(\d{2,3})\s*mm/i) || t.match(/bp[:\s]*(\d{2,3})\s*\/\s*(\d{2,3})/i)
  const systolicBP = bpMatch ? parseInt(bpMatch[1]) : null
  const diastolicBP = bpMatch ? parseInt(bpMatch[2]) : null

  // Blood group
  const bloodGroup = findString([
    /blood\s*(?:group|type)[:\s]*((?:A|B|AB|O)[+-])/i,
    /(?:group|type)[:\s]*((?:A|B|AB|O)[+-])/i
  ])

  // Sugar
  const sugarLevel = findNumber([
    /(?:blood\s*)?(?:sugar|glucose)[:\s]*(\d+\.?\d*)/i,
    /fasting[:\s]*(\d+\.?\d*)/i
  ])

  // Platelet count
  const plateletCount = findNumber([
    /platelet[s]?\s*(?:count)?[:\s]*(\d+\.?\d*)/i,
    /plt[:\s]*(\d+\.?\d*)/i
  ])

  // WBC
  const wbcCount = findNumber([
    /(?:wbc|white\s*blood\s*cell)[s]?\s*(?:count)?[:\s]*(\d+\.?\d*)/i,
    /leucocyte[s]?[:\s]*(\d+\.?\d*)/i
  ])

  // RBC
  const rbcCount = findNumber([
    /(?:rbc|red\s*blood\s*cell)[s]?\s*(?:count)?[:\s]*(\d+\.?\d*)/i,
    /erythrocyte[s]?[:\s]*(\d+\.?\d*)/i
  ])

  // HIV
  const hivStatus = upper.includes('HIV')
    ? (upper.match(/HIV.*?(NEGATIVE|NON[- ]?REACTIVE)/i) ? 'Negative'
      : upper.match(/HIV.*?(POSITIVE|REACTIVE)/i) ? 'Positive' : null)
    : null

  // Hepatitis
  const hepatitisStatus = upper.includes('HEPATITIS') || upper.includes('HBSAG') || upper.includes('HCV')
    ? (upper.match(/(?:HEPATITIS|HBSAG|HCV).*?(NEGATIVE|NON[- ]?REACTIVE)/i) ? 'Negative'
      : upper.match(/(?:HEPATITIS|HBSAG|HCV).*?(POSITIVE|REACTIVE)/i) ? 'Positive' : null)
    : null

  // Malaria
  const malariaStatus = upper.includes('MALARIA')
    ? (upper.match(/MALARIA.*?(NEGATIVE|NOT\s*DETECTED|ABSENT)/i) ? 'Negative'
      : upper.match(/MALARIA.*?(POSITIVE|DETECTED|PRESENT)/i) ? 'Positive' : null)
    : null

  // Patient name
  const patientName = findString([
    /(?:patient|name)[:\s]+([A-Za-z\s]{2,40})/i
  ])

  // Age
  const age = findNumber([/(?:age)[:\s]*(\d{1,3})/i])
  const gender = findString([/(?:gender|sex)[:\s]*(male|female|other|m|f)/i])

  // Date
  const dateMatch = t.match(/(\d{1,2})[\/\-.](\\d{1,2})[\/\-.](\\d{2,4})/)
  let reportDate = null
  if (dateMatch) {
    const y = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]
    reportDate = `${y}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
  }

  const labName = findString([
    /(?:laboratory|lab|hospital|clinic|centre|center)[:\s]+([A-Za-z\s&]{3,60})/i
  ])

  const fieldsFound = [hemoglobin, systolicBP, sugarLevel, plateletCount, wbcCount, rbcCount,
    hivStatus, hepatitisStatus, malariaStatus, bloodGroup, patientName, age].filter(v => v !== null).length

  return {
    patientName,
    age,
    gender: gender
      ? (gender.toLowerCase().startsWith('m') ? 'Male'
        : gender.toLowerCase().startsWith('f') ? 'Female' : 'Other')
      : null,
    bloodGroup,
    hemoglobin,
    systolicBP,
    diastolicBP,
    sugarLevel,
    plateletCount,
    wbcCount,
    rbcCount,
    hivStatus,
    hepatitisStatus,
    malariaStatus,
    reportDate,
    labName,
    confidence: Math.min(90, Math.round((fieldsFound / 12) * 100)),
    method: 'regex'
  }
}

module.exports = { parseReportWithAI, parseReportWithRegex }
