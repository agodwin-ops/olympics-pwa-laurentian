'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOlympicsAuth } from '@/contexts/OlympicsAuthContext'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useOlympicsAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(form.email, form.password)
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen winter-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-olympic-blue rounded-full mb-6 shadow-lg">
            <span className="text-white text-3xl font-oswald font-bold">🏔️</span>
          </div>
          <h1 className="text-4xl font-oswald font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            XV Winter Olympic Saga Game
          </p>
          <p className="text-gray-500">
            Sign in to continue your Olympic journey
          </p>
        </div>

        {/* Login Form */}
        <div className="chef-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-oswald font-semibold text-center text-gray-900 mb-6">
              Login
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                placeholder="your.email@example.com"
                value={form.email}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleInputChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full olympic-button py-3 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Navigation Links */}
          <div className="mt-6 text-center space-y-4">
            <div className="text-gray-600">
              Don't have an account?{' '}
              <Link 
                href="/onboarding" 
                className="text-olympic-blue hover:text-olympic-blue-dark font-medium"
              >
                Register here
              </Link>
            </div>
            
            <div className="text-sm text-gray-500">
              <Link 
                href="/forgot-password" 
                className="text-olympic-blue hover:text-olympic-blue-dark"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 1992 Winter Olympics • Canadian Team • Educational Use</p>
        </div>
      </div>
    </div>
  )
}