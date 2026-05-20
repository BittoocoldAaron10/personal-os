import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { HealthMetric } from '@/lib/types'
import { Heart, Trash2, Activity, Moon, Scale, Droplet } from 'lucide-react'

const METRIC_TYPES = [
  { id: 'workout_minutes', name: 'Workout Minutes', unit: 'min', icon: Activity, color: 'text-red-500' },
  { id: 'study_minutes', name: 'Study Time', unit: 'min', icon: Activity, color: 'text-blue-500' },
  { id: 'sleep_hours', name: 'Sleep', unit: 'hours', icon: Moon, color: 'text-purple-500' },
  { id: 'weight', name: 'Weight', unit: 'kg', icon: Scale, color: 'text-green-500' },
  { id: 'water_intake', name: 'Water', unit: 'liters', icon: Droplet, color: 'text-blue-400' },
  { id: 'hobby_minutes', name: 'Hobby Time', unit: 'min', icon: Heart, color: 'text-yellow-500' },
]

export default function Health() {
  const [user, setUser] = useState<any>(null)
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [selectedMetric, setSelectedMetric] = useState(METRIC_TYPES[0].id)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchMetrics(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const fetchMetrics = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
      setMetrics(data || [])
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const handleAddMetric = async () => {
    if (!user || !value.trim()) return

    try {
      const metricType = METRIC_TYPES.find(m => m.id === selectedMetric)
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('health_metrics')
        .insert([
          {
            user_id: user.id,
            metric_name: selectedMetric,
            value: parseFloat(value),
            unit: metricType?.unit || '',
            date: today,
          },
        ])

      if (!error) {
        setValue('')
        await fetchMetrics(user.id)
      }
    } catch (error) {
      console.error('Error adding metric:', error)
    }
  }

  const handleDelete = async (metricId: string) => {
    try {
      await supabase.from('health_metrics').delete().eq('id', metricId)
      await fetchMetrics(user.id)
    } catch (error) {
      console.error('Error deleting metric:', error)
    }
  }

  const todayMetrics = metrics.filter(m => m.date === new Date().toISOString().split('T')[0])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-white">Loading...</div></div>
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <h1 className="text-4xl font-bold text-white mb-2 mt-12 md:mt-0">Health & Activity</h1>
          <p className="text-gray-400 mb-8">Track workouts, study time, hobbies, and more</p>

          {/* Today's Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {METRIC_TYPES.map(metricType => {
              const todaysValue = todayMetrics
                .filter(m => m.metric_name === metricType.id)
                .reduce((sum, m) => sum + m.value, 0)
              const Icon = metricType.icon

              return (
                <div key={metricType.id} className="card">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={metricType.color} size={24} />
                    <p className="text-gray-400 text-sm">{metricType.name}</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {todaysValue} <span className="text-sm text-gray-400">{metricType.unit}</span>
                  </p>
                </div>
              )
            })}
          </div>

          {/* Add Metric */}
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Log Metric</h2>
            <div className="flex flex-col md:flex-row gap-2">
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
              >
                {METRIC_TYPES.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                ))}
              </select>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMetric()}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                placeholder="Enter value..."
                step="0.1"
              />
              <button onClick={handleAddMetric} className="btn btn-primary">
                Add
              </button>
            </div>
          </div>

          {/* History */}
          <h2 className="text-xl font-bold mb-4">Last 7 Days</h2>
          <div className="space-y-2">
            {metrics.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No metrics logged yet.</p>
            ) : (
              metrics.map(metric => {
                const metricType = METRIC_TYPES.find(m => m.id === metric.metric_name)
                const Icon = metricType?.icon || Activity
                return (
                  <div key={metric.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={metricType?.color || 'text-gray-500'} size={20} />
                        <div>
                          <p className="font-semibold">{metricType?.name || metric.metric_name}</p>
                          <p className="text-sm text-gray-400">{new Date(metric.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-bold">
                          {metric.value} <span className="text-sm text-gray-400">{metric.unit}</span>
                        </p>
                        <button
                          onClick={() => handleDelete(metric.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
