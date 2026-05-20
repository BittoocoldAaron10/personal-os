import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import VoiceInputButton from '@/components/VoiceInputButton'
import { Task } from '@/lib/types'
import { Trash2, Star, Archive } from 'lucide-react'
import axios from 'axios'

const categories = ['Workout', 'Studies', 'Hobbies', 'Work', 'Personal', 'Health', 'Finance']

export default function CRM() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchTasks(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const fetchTasks = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'done')
        .order('priority', { ascending: false })
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const handleAddTask = async () => {
    if (!user || !newTask.trim()) return

    try {
      await axios.post('/api/ai/classify', {
        text: newTask,
        userId: user.id,
      })
      setNewTask('')
      await fetchTasks(user.id)
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const handleToggleKey = async (taskId: string, isKey: boolean) => {
    try {
      await supabase
        .from('tasks')
        .update({ is_key: !isKey })
        .eq('id', taskId)
      await fetchTasks(user.id)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
      await fetchTasks(user.id)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
      await fetchTasks(user.id)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const filteredTasks = selectedCategory === 'All'
    ? tasks
    : tasks.filter(t => t.category === selectedCategory)

  const todoTasks = filteredTasks.filter(t => t.status === 'todo')
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress')
  const doneTasks = filteredTasks.filter(t => t.status === 'done')

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-white">Loading...</div></div>
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <div className="mb-8 mt-12 md:mt-0">
            <h1 className="text-4xl font-bold text-white mb-2">Task Management (CRM)</h1>
            <p className="text-gray-400">Manage your daily tasks and priorities</p>
          </div>

          {/* Add Task */}
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Add New Task</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                placeholder="Describe your task..."
              />
              <VoiceInputButton onTranscript={(t) => { setNewTask(t); handleAddTask(); }} />
            </div>
            <button
              onClick={handleAddTask}
              className="btn btn-primary"
            >
              Add Task
            </button>
          </div>

          {/* Filters and View Toggle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              {['All', ...categories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1 rounded ${view === 'list' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                List
              </button>
              <button
                onClick={() => setView('kanban')}
                className={`px-3 py-1 rounded ${view === 'kanban' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                Kanban
              </button>
            </div>
          </div>

          {/* View */}
          {view === 'list' ? (
            <div className="space-y-3">
              {todoTasks.length === 0 && inProgressTasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No tasks. Add one above!</p>
                </div>
              ) : (
                <>
                  {[...inProgressTasks, ...todoTasks].map(task => (
                    <div
                      key={task.id}
                      className="card hover:border-blue-500 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            <button
                              onClick={() => handleToggleKey(task.id, task.is_key)}
                              className={`transition-all ${task.is_key ? 'text-yellow-500' : 'text-gray-500'}`}
                            >
                              <Star size={20} />
                            </button>
                          </div>
                          <div className="flex gap-2 text-sm">
                            <span className="px-2 py-1 bg-gray-700 rounded">{task.category}</span>
                            <span className={`px-2 py-1 rounded text-white ${
                              task.priority === 'high' ? 'bg-red-600' :
                              task.priority === 'medium' ? 'bg-yellow-600' :
                              'bg-green-600'
                            }`}>
                              {task.priority}
                            </span>
                            <span className={`px-2 py-1 rounded ${
                              task.status === 'todo' ? 'bg-blue-600' : 'bg-purple-600'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Kanban columns */}
              {[
                { title: 'To Do', tasks: todoTasks, status: 'todo' },
                { title: 'In Progress', tasks: inProgressTasks, status: 'in_progress' },
              ].map(column => (
                <div key={column.status} className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-bold mb-4">{column.title} ({column.tasks.length})</h3>
                  <div className="space-y-3">
                    {column.tasks.map(task => (
                      <div
                        key={task.id}
                        className="bg-gray-700 p-3 rounded-lg cursor-move hover:bg-gray-600"
                      >
                        <div className="font-semibold mb-2">{task.title}</div>
                        <div className="text-xs space-y-1">
                          <div>{task.category}</div>
                          <div className={task.priority === 'high' ? 'text-red-500' : ''}>{task.priority}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
