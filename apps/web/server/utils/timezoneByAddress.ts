/**
 * Lightweight timezone inference from a free-form US address string.
 * Falls back to America/Chicago when uncertain.
 */

const TZ_DEFAULT = 'America/Chicago'

const STATE_TO_TZ: Array<{ re: RegExp; tz: string }> = [
  // Pacific
  { re: /\b(CA|CALIFORNIA|WA|WASHINGTON|OR|OREGON|NV|NEVADA)\b/i, tz: 'America/Los_Angeles' },
  // Mountain
  { re: /\b(AZ|ARIZONA|CO|COLORADO|ID|IDAHO|MT|MONTANA|NM|NEW MEXICO|UT|UTAH|WY|WYOMING)\b/i, tz: 'America/Denver' },
  // Central
  { re: /\b(TX|TEXAS|OK|OKLAHOMA|KS|KANSAS|NE|NEBRASKA|SD|SOUTH DAKOTA|ND|NORTH DAKOTA|MN|MINNESOTA|IA|IOWA|MO|MISSOURI|AR|ARKANSAS|LA|LOUISIANA|WI|WISCONSIN|IL|ILLINOIS|MS|MISSISSIPPI|AL|ALABAMA|TN|TENNESSEE)\b/i, tz: 'America/Chicago' },
  // Eastern
  { re: /\b(FL|FLORIDA|GA|GEORGIA|SC|SOUTH CAROLINA|NC|NORTH CAROLINA|VA|VIRGINIA|WV|WEST VIRGINIA|KY|KENTUCKY|OH|OHIO|MI|MICHIGAN|IN|INDIANA|PA|PENNSYLVANIA|NY|NEW YORK|NJ|NEW JERSEY|CT|CONNECTICUT|RI|RHODE ISLAND|MA|MASSACHUSETTS|VT|VERMONT|NH|NEW HAMPSHIRE|ME|MAINE|MD|MARYLAND|DE|DELAWARE|DC|DISTRICT OF COLUMBIA)\b/i, tz: 'America/New_York' },
  // Alaska / Hawaii
  { re: /\b(AK|ALASKA)\b/i, tz: 'America/Anchorage' },
  { re: /\b(HI|HAWAII)\b/i, tz: 'Pacific/Honolulu' },
]

export function isValidIanaTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function inferTimeZoneFromAddress(address: string): string {
  const a = (address || '').trim()
  if (!a) return TZ_DEFAULT
  for (const row of STATE_TO_TZ) {
    if (row.re.test(a)) return row.tz
  }
  return TZ_DEFAULT
}

/**
 * Higher-accuracy timezone detection via Open-Meteo geocoding (global),
 * with US-state heuristic fallback.
 */
export async function resolveTimeZoneFromAddress(address: string): Promise<string> {
  const raw = (address || '').trim()
  if (!raw) return TZ_DEFAULT
  try {
    const q = encodeURIComponent(raw)
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`,
      { headers: { Accept: 'application/json' } },
    )
    if (res.ok) {
      const data = (await res.json()) as { results?: Array<{ timezone?: string }> }
      const tz = data?.results?.[0]?.timezone
      if (isValidIanaTimeZone(tz)) return tz
    }
  } catch {
    // fall through
  }
  return inferTimeZoneFromAddress(raw)
}

