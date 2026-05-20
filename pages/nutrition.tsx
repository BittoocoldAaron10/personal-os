import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import VoiceInputButton from '@/components/VoiceInputButton'
import { NutritionLog } from '@/lib/types'
import { Trash2, Utensils } from 'lucide-react'
import axios from 'axios'

export default function Nutrition() {
  const [user, setUser] = useState<any>(null)
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [mealDescription, setMealDescription] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [loading, setLoading] = useState(true)
  const [estimating, setEstimating] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchLogs(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const fetchLogs = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: false })
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching nutrition logs:', error)
    }
  }

  const handleAddMeal = async () => {
    if (!user || !mealDescription.trim()) return

    setEstimating(true)
    try {
      await axios.post('/api/ai/estimate-calories', {
        mealDescription,
        mealType,
        userId: user.id,
      })
      setMealDescription('')
      await fetchLogs(user.id)
    } catch (error) {
      console.error('Error logging meal:', error)
    } finally {
      setEstimating(false)
    }
  }

  const handleDelete = async (logId: string) => {
    try {
      await supabase.from('nutrition_logs').delete().eq('id', logId)
      await fetchLogs(user.id)
    } catch (error) {
      console.error('Error deleting log:', error)
    }
  }

  const totalCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0)
  const totalProtein = logs.reduce((sum, log) => sum + (log.protein || 0), 0)
  const totalCarbs = logs.reduce((sum, log) => sum + (log.carbs || 0), 0)
  const totalFat = logs.reduce((sum, log) => sum + (log.fat || 0), 0)

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-white">Loading...</div></div>
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <h1 className="text-4xl font-bold text-white mb-2 mt-12 md:mt-0">Nutrition</h1>
          <p className="text-gray-400 mb-8">AI-powered meal tracking</p>

          {/* Daily Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <p className="text-gray-400 text-sm">Calories</p>
              <p className="text-2xl font-bold text-blue-500">{Math.round(totalCalories)}</p>
            </div>
            <div className="card">
              <p className="text-gray-400 text-sm">Protein (g)</p>
              <p className="text-2xl font-bold text-green-500">{Math.round(totalProtein)}</p>
            </div>
            <div className="card">
              <p className="text-gray-400 text-sm">Carbs (g)</p>
              <p className="text-2xl font-bold text-yellow-500">{Math.round(totalCarbs)}</p>
            </div>
            <div className="card">
              <p className="text-gray-400 text-sm">Fat (g)</p>
              <p className="text-2xl font-bold text-orange-500">{Math.round(totalFat)}</p>
            </div>
          </div>

          {/* Add Meal */}
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Log a Meal</h2>
            <div className="space-y-4">
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as any)}
                className="w-full md:w-auto px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddMeal()}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  placeholder="Describe your meal (e.g., 'chicken and rice with broccoli')"
                />
                <VoiceInputButton onTranscript={(t) => setMealDescription(t)} />
                <button
                  onClick={handleAddMeal}
                  disabled={estimating}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {estimating ? 'AI estimating...' : 'Add Meal'}
                </button>
              </div>
            </div>
          </div>

          {/* Today's Meals */}
          <h2 className="text-xl font-bold mb-4">Today's Meals</h2>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Utensils size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">No meals logged today. Add one above!</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-600 text-xs rounded uppercase font-bold">{log.meal_type}</span>
                        <h3 className="font-semibold">{log.description}</h3>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>🔥 {Math.round(log.calories)} cal</span>
                        <span>💪 {Math.round(log.protein || 0)}g protein</span>
                        <span>🍞 {Math.round(log.carbs || 0)}g carbs</span>
                        <span>🥑 {Math.round(log.fat || 0)}g fat</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="text-red-500 hover:text-red-400 ml-4"
                    >
                      <Trash2 size={20} />
                    </button>
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
