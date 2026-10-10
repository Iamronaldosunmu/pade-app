/**
 * Turns what someone typed into a Nigerian mobile number in E.164 form, or null.
 * Accepts 0801 234 5678, 801 234 5678, +234 801 234 5678 and 2348012345678.
 */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  if (d.startsWith('234')) d = d.slice(3)
  else if (d.startsWith('0')) d = d.slice(1)
  return /^[789][01]\d{8}$/.test(d) ? `+234${d}` : null
}

export function formatPhone(e164: string): string {
  const d = e164.replace('+234', '')
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
}

export function parseAge(input: string): number | null {
  if (!/^\d{1,3}$/.test(input.trim())) return null
  return Number(input.trim())
}

export const MIN_AGE = 18
export const isAdult = (age: number | null) => age !== null && age >= MIN_AGE && age <= 99

export function cleanHandle(input: string): string {
  return input.trim().replace(/^@/, '')
}
export const validHandle = (h: string) => /^[A-Za-z0-9._]{1,30}$/.test(h)

/** Each network has its own rules for handles. */
const HANDLE_RULES: Record<'instagram' | 'x' | 'snapchat', RegExp> = {
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  x: /^[A-Za-z0-9_]{1,15}$/,
  snapchat: /^[A-Za-z][A-Za-z0-9._-]{2,14}$/,
}
export const validHandleFor = (kind: keyof typeof HANDLE_RULES, h: string) => HANDLE_RULES[kind].test(h)

export const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ')
export const validName = (s: string) => cleanName(s).length >= 1 && cleanName(s).length <= 24
