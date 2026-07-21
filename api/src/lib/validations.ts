// Subset of project-root validations reused by the API.
// Kept local to avoid cross-tree imports (clean api package boundary).

export function sanitizePhoneNumber(phone: string): string {
  return phone?.replace(/[\s\-()]/g, '') || ''
}

export function validatePhoneNumber(
  phone: string,
  options?: { required?: boolean; allowInternational?: boolean }
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const trimmed = phone?.trim() || ''
  if (!trimmed) {
    if (options?.required) errors.push('Phone number is required')
    return { isValid: !options?.required, errors }
  }
  const pattern = options?.allowInternational
    ? /^\+?[1-9]\d{1,14}$/
    : /^[6-9]\d{9}$/
  if (!pattern.test(trimmed.replace(/\s/g, ''))) {
    errors.push('Please enter a valid 10-digit Indian mobile number starting with 6-9')
  }
  return { isValid: errors.length === 0, errors }
}

export function validateStandard(standard: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!standard) errors.push('Class is required')
  const valid = ['1','2','3','4','5','6','7','8','9','10','11','12']
  if (!valid.includes(standard)) errors.push('Please select a valid class (1-12)')
  return { isValid: errors.length === 0, errors }
}

export function validateDivision(division: string, standard?: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!division) errors.push('Division is required')
  const valid = ['A','B','C','D']
  const higher = ['Science-A','Science-B','Science-C','Science-D','Commerce-A','Commerce-B','Commerce-C','Commerce-D']
  if (standard && parseInt(standard) > 10) {
    if (!higher.includes(division)) errors.push('Please select a valid higher-secondary division')
  } else if (!valid.includes(division)) {
    errors.push('Please select a valid division (A-D)')
  }
  return { isValid: errors.length === 0, errors }
}
