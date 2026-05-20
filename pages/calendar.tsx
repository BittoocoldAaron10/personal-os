import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  created_at: string
}

export default function Calendar() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('09:00')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchEvents(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const fetchEvents = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true })
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const handleAddEvent = async () => {
    if (!user || !newTitle.trim() || !newDate) return

    try {
      const startDateTime = `${newDate}T${newTime}:00`
      const endDateTime = `${newDate}T${parseInt(newTime.split(':')[0]) + 1}:${newTime.split(':')[1]}:00`

      const { error } = await supabase
        .from('calendar_events')
        .insert([
          {
            user_id: user.id,
            title: newTitle,
            start_time: startDateTime,
            end_time: endDateTime,
          },
        ])

      if (!error) {
        setNewTitle('')
        setNewDate('')
        setNewTime('09:00')
        setShowModal(false)
        await fetchEvents(user.id)
      }
    } catch (error) {
      console.error('Error adding event:', error)
    }
  }

  const handleDelete = async (eventId: string) => {
    try {
      await supabase.from('calendar_events').delete().eq('id', eventId)
      await fetchEvents(user.id)
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const upcomingEvents = events.filter(e => new Date(e.start_time) >= new Date())

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-white">Loading...</div></div>
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-center mb-8 mt-12 md:mt-0">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Calendar</h1>
              <p className="text-gray-400">Manage your schedule</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              New Event
            </button>
          </div>

          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon size={48} className="mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">No upcoming events. Add one!</p>
                </div>
              ) : (
                upcomingEvents.map(event => {
                  const start = new Date(event.start_time)
                  return (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-600 px-3 py-2 rounded text-center">
                          <div className="text-xs">{start.toLocaleDateString('en-US', { month: 'short' })}</div>
                          <div className="text-2xl font-bold">{start.getDate()}</div>
                        </div>
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="text-sm text-gray-400">
                            {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="card">
            <p className="text-sm text-gray-400 text-center">
              💡 <strong>Note:</strong> Google Calendar sync requires OAuth setup. For now, events are stored locally in your database.
              <br />
              We can add Google Calendar sync later if needed.
            </p>
          </div>

          {/* Add Event Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="card max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">New Event</h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                    placeholder="Event title..."
                  />
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button onClick={handleAddEvent} className="btn btn-primary">
                      Add Event
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
