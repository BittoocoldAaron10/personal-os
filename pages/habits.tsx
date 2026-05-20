import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Habit } from '@/lib/types'
import { Trash2 } from 'lucide-react'

export default function Habits() {
  const [user, setUser] = useState<any>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabit, setNewHabit] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchHabits(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const fetchHabits = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
      setHabits(data || [])
    } catch (error) {
      console.error('Error fetching habits:', error)
    }
  }

  const handleAddHabit = async () => {
    if (!user || !newHabit.trim()) return

    try {
      const { error } = await supabase
        .from('habits')
        .insert([
          {
            user_id: user.id,
            name: newHabit,
            frequency: 'daily',
            completed_today: false,
          },
        ])

      if (!error) {
        setNewHabit('')
        await fetchHabits(user.id)
      }
    } catch (error) {
      console.error('Error adding habit:', error)
    }
  }

  const handleToggleHabit = async (habitId: string, completed: boolean) => {
    try {
      await supabase
        .from('habits')
        .update({ completed_today: !completed })
        .eq('id', habitId)
      await fetchHabits(user.id)
    } catch (error) {
      console.error('Error toggling habit:', error)
    }
  }

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await supabase.from('habits').delete().eq('id', habitId)
      await fetchHabits(user.id)
    } catch (error) {
      console.error('Error deleting habit:', error)
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
          <h1 className="text-4xl font-bold text-white mb-2 mt-12 md:mt-0">Daily Habits</h1>
          <p className="text-gray-400 mb-8">Track your daily habits and build consistency</p>

          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Add New Habit</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddHabit()}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                placeholder="e.g., Morning workout, Read 30 min..."
              />
              <button onClick={handleAddHabit} className="btn btn-primary">
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {habits.map(habit => (
              <div key={habit.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{habit.name}</h3>
                    <p className="text-gray-400 text-sm">Frequency: {habit.frequency}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleHabit(habit.id, habit.completed_today)}
                      className={`px-4 py-2 rounded font-bold ${
                        habit.completed_today
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {habit.completed_today ? '✓ Done' : '○ Pending'}
                    </button>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {habits.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No habits yet. Add one above!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
