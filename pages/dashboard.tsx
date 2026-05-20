import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import VoiceInputButton from '@/components/VoiceInputButton'
import { Task, Habit, Goal } from '@/lib/types'
import { Eye, EyeOff, Plus } from 'lucide-react'
import axios from 'axios'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [keyTasks, setKeyTasks] = useState<Task[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [newTask, setNewTask] = useState('')
  const [showFinance, setShowFinance] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchDashboardData(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const fetchDashboardData = async (userId: string) => {
    try {
      // Fetch key tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('is_key', true)
        .limit(5)
      setKeyTasks(tasksData || [])

      // Fetch habits
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
      setHabits(habitsData || [])

      // Fetch goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(5)
      setGoals(goalsData || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const handleVoiceInput = async (transcript: string) => {
    if (!user || !transcript.trim()) return

    try {
      await axios.post('/api/ai/classify', {
        text: transcript,
        userId: user.id,
      })
      setNewTask('')
      await fetchDashboardData(user.id)
    } catch (error) {
      console.error('Error classifying task:', error)
    }
  }

  const handleAddTask = async () => {
    if (!user || !newTask.trim()) return
    await handleVoiceInput(newTask)
  }

  const handleHabitToggle = async (habitId: string) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({ completed_today: true })
        .eq('id', habitId)

      if (!error) {
        await fetchDashboardData(user.id)
      }
    } catch (error) {
      console.error('Error updating habit:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="mb-8 mt-12 md:mt-0">
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome, {process.env.NEXT_PUBLIC_USER_NAME}
            </h1>
            <p className="text-gray-400">Your personal operating system</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="md:col-span-2 space-y-6">
              {/* Quick Input */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Add Task</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                    placeholder="Type task or use voice input..."
                  />
                  <VoiceInputButton onTranscript={handleVoiceInput} isLoading={!user} />
                </div>
              </div>

              {/* Daily Habits */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Daily Habits</h2>
                <div className="space-y-2">
                  {habits.length === 0 ? (
                    <p className="text-gray-400">No habits yet. Create one in the Habits section.</p>
                  ) : (
                    habits.map((habit) => (
                      <div
                        key={habit.id}
                        className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600"
                      >
                        <span>{habit.name}</span>
                        <button
                          onClick={() => handleHabitToggle(habit.id)}
                          className={`px-3 py-1 rounded ${
                            habit.completed_today
                              ? 'bg-green-600'
                              : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                        >
                          {habit.completed_today ? '✓' : '○'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Key Tasks */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Key Tasks Today</h2>
                <div className="space-y-2">
                  {keyTasks.length === 0 ? (
                    <p className="text-gray-400">Star tasks in the CRM section to mark them as key priorities.</p>
                  ) : (
                    keyTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-gray-700 rounded-lg border-l-4 border-blue-600"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{task.title}</h3>
                            <p className="text-sm text-gray-400">{task.category}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            task.priority === 'high' ? 'bg-red-600' :
                            task.priority === 'medium' ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Finance Pulse */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Finance Pulse</h2>
                  <button
                    onClick={() => setShowFinance(!showFinance)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showFinance ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {showFinance ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-400 text-sm">Net Worth</p>
                      <p className="text-2xl font-bold text-green-500">$--,---.--</p>
                    </div>
                    <div className="pt-3 border-t border-gray-700">
                      <p className="text-gray-400 text-sm">This Month</p>
                      <p className="text-xl font-bold">$--,---.--</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center">
                    <p className="text-gray-400">Click eye icon to reveal</p>
                  </div>
                )}
              </div>

              {/* Goals */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Goals</h2>
                <div className="space-y-3">
                  {goals.length === 0 ? (
                    <p className="text-gray-400 text-sm">Create goals in the Goals section</p>
                  ) : (
                    goals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="p-2 bg-gray-700 rounded">
                        <p className="font-semibold text-sm">{goal.title}</p>
                        <p className="text-xs text-gray-400">{goal.timeframe}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Stats</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Tasks</span>
                    <span className="font-semibold">{keyTasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Habits</span>
                    <span className="font-semibold">{habits.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Goals</span>
                    <span className="font-semibold">{goals.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
