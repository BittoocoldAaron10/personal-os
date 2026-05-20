import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Goal } from '@/lib/types'
import { Target, Trash2, CheckCircle } from 'lucide-react'

export default function Goals() {
  const [user, setUser] = useState<any>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [newGoal, setNewGoal] = useState('')
  const [description, setDescription] = useState('')
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchGoals(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const fetchGoals = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      setGoals(data || [])
    } catch (error) {
      console.error('Error fetching goals:', error)
    }
  }

  const handleAddGoal = async () => {
    if (!user || !newGoal.trim()) return

    try {
      const { error } = await supabase
        .from('goals')
        .insert([
          {
            user_id: user.id,
            title: newGoal,
            description: description,
            timeframe: timeframe,
            status: 'active',
          },
        ])

      if (!error) {
        setNewGoal('')
        setDescription('')
        await fetchGoals(user.id)
      }
    } catch (error) {
      console.error('Error adding goal:', error)
    }
  }

  const handleToggleStatus = async (goalId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'completed' : 'active'
      await supabase.from('goals').update({ status: newStatus }).eq('id', goalId)
      await fetchGoals(user.id)
    } catch (error) {
      console.error('Error toggling goal:', error)
    }
  }

  const handleDelete = async (goalId: string) => {
    try {
      await supabase.from('goals').delete().eq('id', goalId)
      await fetchGoals(user.id)
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-white">Loading...</div></div>
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <h1 className="text-4xl font-bold text-white mb-2 mt-12 md:mt-0">Goals</h1>
          <p className="text-gray-400 mb-8">Set and track your weekly, monthly, and yearly goals</p>

          {/* Add Goal */}
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">New Goal</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                placeholder="Goal title..."
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                placeholder="Description (optional)..."
                rows={2}
              />
              <div className="flex flex-col md:flex-row gap-2">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <button onClick={handleAddGoal} className="btn btn-primary md:ml-auto">
                  Add Goal
                </button>
              </div>
            </div>
          </div>

          {/* Active Goals */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Active Goals ({activeGoals.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGoals.length === 0 ? (
                <div className="text-center py-12 col-span-2">
                  <Target size={48} className="mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">No active goals. Add one above!</p>
                </div>
              ) : (
                activeGoals.map(goal => (
                  <div key={goal.id} className="card">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        goal.timeframe === 'weekly' ? 'bg-blue-600' :
                        goal.timeframe === 'monthly' ? 'bg-purple-600' :
                        'bg-green-600'
                      }`}>
                        {goal.timeframe.toUpperCase()}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleStatus(goal.id, goal.status)}
                          className="text-green-500 hover:text-green-400"
                          title="Mark complete"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{goal.title}</h3>
                    {goal.description && <p className="text-gray-400 text-sm">{goal.description}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Completed ({completedGoals.length})</h2>
              <div className="space-y-2">
                {completedGoals.map(goal => (
                  <div key={goal.id} className="card opacity-60">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold line-through">{goal.title}</h3>
                        <p className="text-xs text-gray-400">{goal.timeframe}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleStatus(goal.id, goal.status)}
                          className="text-blue-500 hover:text-blue-400 text-sm"
                        >
                          Reactivate
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
