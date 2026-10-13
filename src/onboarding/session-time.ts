/** Fridays, 9 to 10pm Lagos time. Lagos is UTC+1 all year, so 9pm is 20:00 UTC. */
export const SESSION_HOUR_UTC = 20

/** The next session start (a UTC instant). If it is Friday before 9pm in Lagos, that is tonight. */
export function nextSession(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), SESSION_HOUR_UTC))
  const daysAhead = (5 - d.getUTCDay() + 7) % 7
  d.setUTCDate(d.getUTCDate() + daysAhead)
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 7)
  return d
}

export function sessionLabel(start: Date): string {
  const lagos = new Date(start.getTime() + 3600_000)
  const day = lagos.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return `${day}, 9pm`
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** A link that opens Google Calendar with the session filled in, repeating every Friday. */
export function googleCalendarUrl(start: Date): string {
  const end = new Date(start.getTime() + 3600_000)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Pàdé Friday',
    dates: `${stamp(start)}/${stamp(end)}`,
    details: 'Five-minute conversations with new people in Lagos. Find a quiet spot and charge your phone.',
    ctz: 'Africa/Lagos',
    recur: 'RRULE:FREQ=WEEKLY;BYDAY=FR',
  })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}
