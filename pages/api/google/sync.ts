import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabase'
import { listEvents, createEvent, updateEvent, googleToOsFields } from '@/lib/google/calendar'

// Bidirectional reconciliation between the OS calendar_events table and the
// user's Google Calendar. Conflict rule: the most recently updated side wins.
//
// Sync window: 120 days back to 365 days ahead. Events outside this range are
// left untouched on both sides.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  try {
    const supabase = supabaseServer()
    const { data: sync } = await supabase
      .from('calendar_sync')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!sync) return res.status(400).json({ error: 'Google Calendar is not connected.' })
    if (!sync.enabled) {
      return res.status(200).json({ pulled: 0, pushed: 0, updated: 0, deleted: 0 })
    }

    const calId = sync.google_calendar_id
    const tz = sync.timezone || 'UTC'

    const now = Date.now()
    const timeMin = new Date(now - 120 * 86400000).toISOString()
    const timeMax = new Date(now + 365 * 86400000).toISOString()
    const minMs = Date.parse(timeMin)
    const maxMs = Date.parse(timeMax)
    const inWindow = (s: string) => {
      const t = Date.parse(String(s || '').replace(' ', 'T'))
      return !Number.isNaN(t) && t >= minMs && t <= maxMs
    }

    // Fetch both sides.
    const gEvents = (await listEvents(calId, timeMin, timeMax)).filter(
      (g) => g.id && g.status !== 'cancelled'
    )
    const { data: osRows } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
    const osEvents = osRows || []

    const gById = new Map(gEvents.map((g) => [g.id, g] as const))
    const linkedGids = new Set<string>()

    let pulled = 0
    let pushed = 0
    let updated = 0
    let deleted = 0

    // --- Reconcile every OS event against Google ---
    for (const os of osEvents) {
      // A. New in the OS (never pushed) -> create it in Google.
      if (!os.google_event_id) {
        try {
          const g = await createEvent(calId, os, tz)
          await supabase
            .from('calendar_events')
            .update({ google_event_id: g.id, updated_at: g.updated || new Date().toISOString() })
            .eq('id', os.id)
          linkedGids.add(g.id)
          pushed++
        } catch (e: any) {
          console.error('sync: create-in-google failed:', e?.message || e)
        }
        continue
      }

      linkedGids.add(os.google_event_id)
      const g = gById.get(os.google_event_id)

      // C. Linked, but gone from Google within the window -> deleted there.
      if (!g) {
        if (inWindow(os.start_time)) {
          await supabase.from('calendar_events').delete().eq('id', os.id)
          deleted++
        }
        continue
      }

      // B. Exists on both sides -> most recently updated side wins.
      const gMs = Date.parse(g.updated || '')
      const osMs = Date.parse(String(os.updated_at || os.created_at || '').replace(' ', 'T'))
      if (Number.isNaN(gMs) || Number.isNaN(osMs)) continue

      if (gMs - osMs > 1000) {
        // Google is newer -> overwrite the OS copy.
        const fields = googleToOsFields(g, tz)
        if (fields.start_time) {
          await supabase
            .from('calendar_events')
            .update({ ...fields, updated_at: g.updated })
            .eq('id', os.id)
          updated++
        }
      } else if (osMs - gMs > 1000) {
        // OS is newer -> overwrite the Google copy.
        try {
          const g2 = await updateEvent(calId, os.google_event_id, os, tz)
          await supabase
            .from('calendar_events')
            .update({ updated_at: g2.updated || new Date().toISOString() })
            .eq('id', os.id)
          updated++
        } catch (e: any) {
          console.error('sync: update-in-google failed:', e?.message || e)
        }
      }
    }

    // --- D. Google events with no OS counterpart -> create them in the OS ---
    const newRows: any[] = []
    for (const g of gEvents) {
      if (linkedGids.has(g.id)) continue
      const fields = googleToOsFields(g, tz)
      if (!fields.start_time) continue
      newRows.push({
        user_id: userId,
        ...fields,
        google_event_id: g.id,
        updated_at: g.updated || new Date().toISOString(),
      })
    }
    if (newRows.length) {
      const { error } = await supabase.from('calendar_events').insert(newRows)
      if (error) console.error('sync: insert-into-os failed:', error.message)
      else pulled = newRows.length
    }

    const lastSyncedAt = new Date().toISOString()
    await supabase
      .from('calendar_sync')
      .update({ last_synced_at: lastSyncedAt })
      .eq('user_id', userId)

    return res.status(200).json({ pulled, pushed, updated, deleted, lastSyncedAt })
  } catch (e: any) {
    console.error('google/sync error:', e?.message || e)
    return res.status(500).json({ error: e?.message || 'Sync failed' })
  }
}
