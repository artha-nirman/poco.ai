'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupportedCountries, getCountryDisplayName } from '@/lib/config/country-loader'

interface CountryOption {
  code: string
  name: string
  flag: string
}

export default function LandingPage() {
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadCountries()
  }, [])

  const loadCountries = async () => {
    try {
      const supportedCountries = getSupportedCountries()
      const countryOptions = await Promise.all(
        supportedCountries.map(async (code) => ({
          code: code.toLowerCase(),
          name: await getCountryDisplayName(code),
          flag: getFlagEmoji(code)
        }))
      )
      setCountries(countryOptions)
      
      // Auto-detect user's country (placeholder logic)
      const detectedCountry = await detectUserCountry()
      setSelectedCountry(detectedCountry)
    } catch (error) {
      console.error('Failed to load countries:', error)
    } finally {
      setLoading(false)
    }
  }

  const detectUserCountry = async (): Promise<string> => {
    // TODO: Implement IP geolocation
    // For now, default to Australia
    return 'au'
  }

  const getFlagEmoji = (countryCode: string): string => {
    const flags: Record<string, string> = {
      AU: '🇦🇺',
      SG: '🇸🇬', 
      NZ: '🇳🇿'
    }
    return flags[countryCode.toUpperCase()] || '🌍'
  }

  const handleStartAnalysis = () => {
    if (selectedCountry) {
      router.push(`/${selectedCountry}/policies/analyze`)
    }
  }

  const handleQuickStart = () => {
    // Use auto-detected country for quick start
    router.push('/policies/analyze')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Poco.ai
          </h1>
          <p className="text-xl text-gray-600">
            AI-powered health insurance comparison platform
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Privacy-first • Transparent • Expert-level analysis
          </p>
        </div>

        {/* Country Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
            Select Your Country
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {countries.map((country) => (
              <button
                key={country.code}
                onClick={() => setSelectedCountry(country.code)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedCountry === country.code
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-3xl mb-2">{country.flag}</div>
                <div className="font-medium">{country.name}</div>
                <div className="text-sm text-gray-500 uppercase">{country.code}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleStartAnalysis}
            disabled={!selectedCountry}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                     text-white font-semibold py-4 px-6 rounded-lg transition-colors
                     disabled:cursor-not-allowed"
          >
            Start Policy Analysis
          </button>
          
          <button
            onClick={handleQuickStart}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 
                     font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Quick Start (Auto-detect Location)
          </button>
        </div>

        {/* Features */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="flex items-start space-x-3">
            <div className="text-green-500 text-xl">🔒</div>
            <div>
              <h3 className="font-semibold text-gray-800">Privacy First</h3>
              <p className="text-sm text-gray-600">Zero-knowledge architecture</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 text-xl">🤖</div>
            <div>
              <h3 className="font-semibold text-gray-800">AI Powered</h3>
              <p className="text-sm text-gray-600">Expert-level analysis</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-purple-500 text-xl">⚡</div>
            <div>
              <h3 className="font-semibold text-gray-800">Fast Results</h3>
              <p className="text-sm text-gray-600">60-second analysis</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-orange-500 text-xl">🌍</div>
            <div>
              <h3 className="font-semibold text-gray-800">Global Support</h3>
              <p className="text-sm text-gray-600">Multi-country coverage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}