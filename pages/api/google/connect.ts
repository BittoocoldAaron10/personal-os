import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabase'
import { googleConfigured, verifyAccess } from '@/lib/google/calendar'

// Links a user's Google Calendar. The service account must already have been
// granted access by sharing the calendar — verifyAccess confirms that.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, calendarId, timezone } = req.body || {}
  if (!userId || !calendarId) {
    return res.status(400).json({ error: 'Missing userId or calendarId' })
  }
  if (!googleConfigured()) {
    return res.status(400).json({
      error: 'Server is missing GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY. See GOOGLE_CALENDAR_SETUP.md.',
    })
  }

  const calId = String(calendarId).trim()

  // Confirm the service account can actually reach this calendar.
  try {
    await verifyAccess(calId)
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Could not access that calendar' })
  }

  try {
    const supabase = supabaseServer()
    const { error } = await supabase.from('calendar_sync').upsert(
      {
        user_id: userId,
        google_calendar_id: calId,
        timezone: String(timezone || 'UTC'),
        enabled: true,
      },
      { onConflict: 'user_id' }
    )
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  } catch (e: any) {
    console.error('google/connect error:', e?.message || e)
    return res.status(500).json({ error: 'Could not save calendar connection' })
  }
}
