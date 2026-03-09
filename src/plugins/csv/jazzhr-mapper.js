/**
 * JazzHR Native CSV Export → Internal Schema Mapper
 *
 * JazzHR's standard candidate export columns (as of 2024):
 *   First Name, Last Name, Email, Phone, Job, Stage, Source,
 *   Location, Date Applied, Last Activity, Rating, Notes
 *
 * Stage normalization maps JazzHR's 15-stage STAQSS workflow
 * down to 5 simplified groups for the dashboard.
 */

// Default column mapping: internal field → JazzHR CSV header (case-insensitive)
export const DEFAULT_COLUMN_MAP = {
  firstName:    'First Name',
  lastName:     'Last Name',
  email:        'Email',
  phone:        'Phone',
  jobTitle:     'Job',
  stage:        'Stage',
  source:       'Source',
  location:     'Location',
  appliedDate:  'Date Applied',
  lastActivity: 'Last Activity',
  rating:       'Rating',
  notes:        'Notes',
}

/**
 * Maps a raw JazzHR stage string → one of 5 normalized groups.
 * Handles both the 15-stage STAQSS workflow and standard JazzHR defaults.
 */
export function normalizeStage(rawStage) {
  if (!rawStage) return 'Inactive'
  const s = rawStage.trim().toUpperCase()

  // STAQSS custom stages
  if (s.startsWith('1A') || s.startsWith('1B') || s.startsWith('1C')) return 'Hired'
  if (s.startsWith('2A') || s.startsWith('2B') || s.startsWith('2C')) return 'Interviewed'
  if (s.startsWith('3A') || s.startsWith('3B')) return 'Submitted'
  if (s.startsWith('4A') || s.startsWith('4B') || s.startsWith('4C')) return 'Screened'
  if (s.startsWith('5') || s.startsWith('6')) return 'Inactive'

  // Standard JazzHR stages
  if (s.includes('HIRED') || s.includes('STARTED') || s.includes('OFFER ACCEPTED')) return 'Hired'
  if (s.includes('OFFER')) return 'Offered'
  if (s.includes('INTERVIEW')) return 'Interviewed'
  if (s.includes('SUBMIT') || s.includes('REVIEW')) return 'Submitted'
  if (s.includes('SCREEN') || s.includes('PHONE') || s.includes('CONTACT') || s.includes('INITIAL')) return 'Screened'
  if (s.includes('REJECT') || s.includes('DECLINE') || s.includes('DTP') || s.includes('NIS')) return 'Inactive'

  return 'Screened' // default: treat unknown active stages as screened
}

export const STAGE_ORDER = ['Screened', 'Submitted', 'Interviewed', 'Offered', 'Hired']
export const STAGE_COLORS = {
  Screened:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  Submitted:  { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  Interviewed:{ bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400' },
  Offered:    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-400' },
  Hired:      { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  dot: 'bg-green-400'  },
  Inactive:   { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-500',   dot: 'bg-gray-300'   },
}

/**
 * Transforms a raw JazzHR CSV row object (keyed by header) into a
 * normalized internal Candidate record using the provided column map.
 */
export function mapRow(row, columnMap = DEFAULT_COLUMN_MAP) {
  const get = (field) => {
    const header = columnMap[field]
    if (!header) return ''
    // case-insensitive key lookup
    const key = Object.keys(row).find(k => k.trim().toLowerCase() === header.toLowerCase())
    return key ? (row[key] ?? '').trim() : ''
  }

  const firstName = get('firstName')
  const lastName  = get('lastName')
  const rawStage  = get('stage')

  return {
    id:           `${firstName}-${lastName}-${get('jobTitle')}`.replace(/\s+/g, '-').toLowerCase(),
    firstName,
    lastName,
    fullName:     [firstName, lastName].filter(Boolean).join(' '),
    email:        get('email'),
    phone:        get('phone'),
    jobTitle:     get('jobTitle'),
    stage:        rawStage,
    stageGroup:   normalizeStage(rawStage),
    source:       get('source'),
    appliedDate:  get('appliedDate'),
    lastActivity: get('lastActivity'),
    location:     get('location'),
    clearance:    get('clearance') || '',
    salary:       get('salary') || '',
    notes:        get('notes'),
  }
}
