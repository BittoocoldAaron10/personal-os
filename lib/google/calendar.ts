// Google Calendar integration via a service account.
//
// The app authenticates as a service account (no per-user OAuth dance).
// Each user shares their Google Calendar with the service account's email,
// granting it "Make changes to events" access. The service account then
// reads/writes that calendar on the user's behalf.

import { JWT } from 'google-auth-library'

const SCOPES = ['https://www.googleapis.com/auth/calendar']
const API = 'https://www.googleapis.com/calendar/v3'

// ----- Service-account auth ------------------------------------------------

let cachedClient: JWT | null = null

function client(): JWT {
  if (cachedClient) return cachedClient
  const email = process.env.GOOGLE_CLIENT_EMAIL
  // Private keys stored in .env keep their newlines as the literal text "\n".
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!email || !key) {
    throw new Error(
      'Google service account not configured. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local'
    )
  }
  cachedClient = new JWT({ email, key, scopes: SCOPES })
  return cachedClient
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
}

export function serviceAccountEmail(): string {
  return process.env.GOOGLE_CLIENT_EMAIL || ''
}

async function googleToken(): Promise<string> {
  const res = await client().getAccessToken()
  const token = typeof res === 'string' ? res : res?.token
  if (!token) throw new Error('Could not obtain a Google access token')
  return token
}

// ----- Low-level REST helper ----------------------------------------------

interface ApiError extends Error {
  status?: number
}

async function gapi(path: string, init: RequestInit = {}): Promise<any> {
  const token = await googleToken()
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    const err: ApiError = new Error(`Google Calendar API ${res.status}: ${text.slice(0, 400)}`)
    err.status = res.status
    throw err
  }
  return text ? JSON.parse(text) : null
}

// ----- Types ---------------------------------------------------------------

export interface GEvent {
  id: string
  status?: string
  summary?: string
  description?: string
  updated?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
}

export interface OsEventInput {
  title: string
  description?: string | null
  start_time: string
  end_time: string
}

// ----- Calendar operations -------------------------------------------------

// Verify the service account can actually reach a calendar. Throws a
// human-readable error when the calendar is missing or not shared.
export async function verifyAccess(calendarId: string): Promise<void> {
  try {
    await gapi(`/calendars/${encodeURIComponent(calendarId)}`)
  } catch (e) {
    const status = (e as ApiError).status
    if (status === 404) {
      throw new Error(
        `Calendar "${calendarId}" not found, or it has not been shared with the service account yet.`
      )
    }
    if (status === 403) {
      throw new Error(
        'The service account does not have permission for this calendar. Share it with "Make changes to events" access.'
      )
    }
    throw e
  }
}

export async function listEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GEvent[]> {
  const cid = encodeURIComponent(calendarId)
  const out: GEvent[] = []
  let pageToken: string | undefined
  do {
    const qs = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
      showDeleted: 'false',
    })
    if (pageToken) qs.set('pageToken', pageToken)
    const data = await gapi(`/calendars/${cid}/events?${qs.toString()}`)
    for (const item of data?.items || []) out.push(item as GEvent)
    pageToken = data?.nextPageToken
  } while (pageToken)
  return out
}

export async function createEvent(calendarId: string, ev: OsEventInput, tz: string): Promise<GEvent> {
  return gapi(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(osToGoogleBody(ev, tz)),
  })
}

export async function updateEvent(
  calendarId: string,
  eventId: string,
  ev: OsEventInput,
  tz: string
): Promise<GEvent> {
  return gapi(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(osToGoogleBody(ev, tz)),
  })
}

export async function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  try {
    await gapi(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    )
  } catch (e) {
    // Already gone on Google's side — nothing to do.
    const status = (e as ApiError).status
    if (status === 404 || status === 410) return
    throw e
  }
}

// ----- Date conversion -----------------------------------------------------
//
// The OS stores naive wall-clock datetimes ("2026-05-22T09:00:00") and
// displays them by string-slicing, ignoring timezones. Google needs an
// explicit timezone, so we pair the wall-clock string with the user's tz.

// Strip any timezone offset / fractional seconds, normalise to HH:mm:ss.
function naiveLocal(s: string): string {
  let v = String(s || '').trim().replace(' ', 'T')
  v = v.replace(/\.\d+/, '').replace(/(Z|[+-]\d\d:?\d\d)$/, '')
  const [d, t = '00:00:00'] = v.split('T')
  const seg = t.split(':')
  const hh = (seg[0] || '00').padStart(2, '0')
  const mm = (seg[1] || '00').padStart(2, '0')
  const ss = (seg[2] || '00').padStart(2, '0')
  return `${d}T${hh}:${mm}:${ss}`
}

// Wall-clock time of an instant, as seen in a given timezone.
function wallClockInTz(d: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(d)
    const p: Record<string, string> = {}
    for (const part of parts) p[part.type] = part.value
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`
  } catch {
    return naiveLocal(d.toISOString())
  }
}

function osToGoogleBody(ev: OsEventInput, timeZone: string) {
  return {
    summary: ev.title || '(untitled)',
    description: ev.description || '',
    start: { dateTime: naiveLocal(ev.start_time), timeZone },
    end: { dateTime: naiveLocal(ev.end_time), timeZone },
  }
}

function gPoint(point: GEvent['start'], timeZone: string): string {
  if (!point) return ''
  if (point.dateTime) return wallClockInTz(new Date(point.dateTime), timeZone)
  if (point.date) return `${point.date}T00:00:00` // all-day event
  return ''
}

// Map a Google event onto the OS calendar_events column shape.
export function googleToOsFields(g: GEvent, timeZone: string) {
  return {
    title: g.summary || '(untitled)',
    description: g.description || null,
    start_time: gPoint(g.start, timeZone),
    end_time: gPoint(g.end, timeZone) || gPoint(g.start, timeZone),
  }
}
