import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabase'
import { googleConfigured, serviceAccountEmail } from '@/lib/google/calendar'

// Reports whether Google Calendar sync is configured (server env) and
// connected (user has linked a calendar).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req.query.userId || req.body?.userId) as string | undefined
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  try {
    const supabase = supabaseServer()
    const { data } = await supabase
      .from('calendar_sync')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    return res.status(200).json({
      configured: googleConfigured(),
      serviceAccountEmail: serviceAccountEmail(),
      connected: Boolean(data),
      calendarId: data?.google_calendar_id || null,
      timezone: data?.timezone || null,
      lastSyncedAt: data?.last_synced_at || null,
    })
  } catch (e: any) {
    console.error('google/status error:', e?.message || e)
    return res.status(500).json({ error: 'Could not load sync status' })
  }
}
