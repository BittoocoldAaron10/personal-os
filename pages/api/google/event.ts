import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabase'
import { createEvent, deleteEvent } from '@/lib/google/calendar'

// Instant single-event push to Google, used right after the user adds or
// deletes an event in the OS so the change shows up immediately. If sync is
// not connected this is a no-op — the local calendar still works.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, action, osEventId, googleEventId } = req.body || {}
  if (!userId || !action) return res.status(400).json({ error: 'Missing userId or action' })

  try {
    const supabase = supabaseServer()
    const { data: sync } = await supabase
      .from('calendar_sync')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // Not connected — quietly skip so the local calendar keeps working.
    if (!sync || !sync.enabled) return res.status(200).json({ skipped: true })

    const calId = sync.google_calendar_id
    const tz = sync.timezone || 'UTC'

    if (action === 'create') {
      if (!osEventId) return res.status(400).json({ error: 'Missing osEventId' })
      const { data: ev } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', osEventId)
        .eq('user_id', userId)
        .maybeSingle()
      if (!ev) return res.status(404).json({ error: 'Event not found' })
      // Already linked — nothing to do.
      if (ev.google_event_id) {
        return res.status(200).json({ ok: true, googleEventId: ev.google_event_id })
      }
      const g = await createEvent(calId, ev, tz)
      await supabase
        .from('calendar_events')
        .update({ google_event_id: g.id, updated_at: g.updated || new Date().toISOString() })
        .eq('id', osEventId)
      return res.status(200).json({ ok: true, googleEventId: g.id })
    }

    if (action === 'delete') {
      if (googleEventId) await deleteEvent(calId, googleEventId)
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (e: any) {
    console.error('google/event error:', e?.message || e)
    return res.status(500).json({ error: e?.message || 'Google Calendar push failed' })
  }
}
