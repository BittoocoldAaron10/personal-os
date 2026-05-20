import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import VoiceInputButton from '@/components/VoiceInputButton'
import { JournalEntry } from '@/lib/types'
import { Book, ChevronDown, ChevronUp } from 'lucide-react'

export default function Journaling() {
  const [user, setUser] = useState<any>(null)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchEntries(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const fetchEntries = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30)
      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching journal entries:', error)
    }
  }

  const handleAddEntry = async () => {
    if (!user || !content.trim()) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const summary = content.length > 100 ? content.substring(0, 100) + '...' : content

      const { error } = await supabase
        .from('journal_entries')
        .insert([
          {
            user_id: user.id,
            content: content,
            date: today,
            summary: summary,
          },
        ])

      if (!error) {
        setContent('')
        await fetchEntries(user.id)
      }
    } catch (error) {
      console.error('Error adding entry:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-white">Loading...</div></div>
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <h1 className="text-4xl font-bold text-white mb-2 mt-12 md:mt-0">Journaling</h1>
          <p className="text-gray-400 mb-8">Daily reflection and pattern analysis</p>

          {/* New Entry */}
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Today's Entry</h2>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg min-h-[150px]"
              placeholder="How was your day? What did you accomplish? What's on your mind?"
            />
            <div className="flex justify-between items-center mt-4">
              <VoiceInputButton onTranscript={(t) => setContent(prev => prev + ' ' + t)} />
              <button
                onClick={handleAddEntry}
                disabled={!content.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                Save Entry
              </button>
            </div>
          </div>

          {/* Previous Entries */}
          <h2 className="text-xl font-bold mb-4">Previous Entries</h2>
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-12">
                <Book size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">No journal entries yet. Start writing!</p>
              </div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="card">
                  <div
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                      {expandedId === entry.id ? <ChevronUp /> : <ChevronDown />}
                    </div>
                    <p className="text-gray-400 text-sm">
                      {expandedId === entry.id ? entry.content : entry.summary}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
