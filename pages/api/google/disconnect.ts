import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabase'

// Unlinks Google Calendar. Existing events stay in the OS; they simply stop
// syncing. The google_event_id on each event is kept so re-connecting later
// reconciles cleanly instead of duplicating.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  try {
    const supabase = supabaseServer()
    const { error } = await supabase.from('calendar_sync').delete().eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  } catch (e: any) {
    console.error('google/disconnect error:', e?.message || e)
    return res.status(500).json({ error: 'Could not disconnect' })
  }
}
