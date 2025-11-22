/**
 * V2 Country Policy Pages
 * Dynamic route that handles all country-specific policy operations
 * 
 * URL: /[country]/policies/*
 */

'use client'

import { use } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCountryConfiguration } from '@/lib/config/country-loader'
import { validateCountryCode } from '@/lib/utils/country-detection'
import { PolicyAnalyzer } from '@/app/components/PolicyAnalyzer'
import { SystemStatusIndicator } from '@/app/components/SystemStatusIndicator'
import type { CountryConfiguration } from '@/lib/types/v2/index'

interface CountryPolicyPageProps {
  params: Promise<{
    country: string
  }>
}

export default function CountryPolicyPage({ params }: CountryPolicyPageProps) {
  const router = useRouter()
  const [countryConfig, setCountryConfig] = useState<CountryConfiguration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [country, setCountry] = useState<string>('')

  useEffect(() => {
    async function loadCountryConfig() {
      try {
        const { country: countryParam } = await params
        setCountry(countryParam)
        const countryCode = countryParam.toUpperCase()
        
        // Validate country code
        if (!validateCountryCode(countryCode)) {
          setError(`Country "${countryCode}" is not supported`)
          setIsLoading(false)
          return
        }

        // Load country configuration
        const config = await getCountryConfiguration(countryCode)
        if (!config) {
          setError(`Configuration not found for country "${countryCode}"`)
          setIsLoading(false)
          return
        }

        setCountryConfig(config)
        setError(null)
      } catch (err) {
        console.error('Failed to load country configuration:', err)
        setError('Failed to load country configuration')
      } finally {
        setIsLoading(false)
      }
    }

    loadCountryConfig()
  }, [params])  // params is now a Promise, use it as dependency

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading {country.toUpperCase()} configuration...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !countryConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-lg">
          <div className="text-6xl">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900">Country Not Supported</h1>
          <p className="text-gray-600">{error}</p>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-3">Supported Countries</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center space-x-3 p-3 rounded border">
                <span className="text-2xl">🇦🇺</span>
                <div>
                  <p className="font-medium">Australia</p>
                  <p className="text-sm text-gray-500">Full health insurance analysis</p>
                </div>
                <button 
                  onClick={() => router.push('/au/policies')}
                  className="ml-auto px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Select
                </button>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded border">
                <span className="text-2xl">🇸🇬</span>
                <div>
                  <p className="font-medium">Singapore</p>
                  <p className="text-sm text-gray-500">Health insurance analysis</p>
                </div>
                <button 
                  onClick={() => router.push('/sg/policies')}
                  className="ml-auto px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Select
                </button>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded border">
                <span className="text-2xl">🇳🇿</span>
                <div>
                  <p className="font-medium">New Zealand</p>
                  <p className="text-sm text-gray-500">Health insurance analysis</p>
                </div>
                <button 
                  onClick={() => router.push('/nz/policies')}
                  className="ml-auto px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Select
                </button>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => router.push('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    )
  }

  // Main policy analysis interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← POCO
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {countryConfig.countryCode === 'AU' && '🇦🇺'}
                  {countryConfig.countryCode === 'SG' && '🇸🇬'}
                  {countryConfig.countryCode === 'NZ' && '🇳🇿'}
                </span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {countryConfig.countryName} Policy Analysis
                  </h1>
                  <p className="text-sm text-gray-500">
                    Powered by {countryConfig.regulatoryFramework?.frameworkName || 'local regulations'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right text-sm text-gray-600">
                <p>Currency: {countryConfig.currency}</p>
                <p>Framework: v2.0</p>
              </div>
              <SystemStatusIndicator />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Country-specific notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-blue-500 text-lg">ℹ️</div>
              <div>
                <h3 className="text-blue-800 font-medium">
                  {countryConfig.countryName} Specific Analysis
                </h3>
                <p className="text-blue-700 text-sm mt-1">
                  Analysis results are tailored to {countryConfig.countryName} insurance regulations
                  and market standards. Costs shown in {countryConfig.currency}.
                </p>
              </div>
            </div>
          </div>

          {/* Policy Analyzer with country configuration */}
          <PolicyAnalyzer 
            countryConfiguration={countryConfig}
            apiEndpoint={`/api/v2/${country.toLowerCase()}/policies/analyze`}
            progressEndpoint={`/api/v2/${country.toLowerCase()}/policies/progress`}
            resultsEndpoint={`/api/v2/${country.toLowerCase()}/policies/results`}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <p>POCO v2.0 - {countryConfig.countryName} Edition</p>
              <p>Regulatory framework: {countryConfig.regulatoryFramework?.frameworkName || 'Standard'}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-800"
              >
                Switch Country
              </button>
              <a href="/privacy" className="text-gray-500 hover:text-gray-700">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}