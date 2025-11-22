import { loadCountryConfig } from '@/lib/config/country-loader'
import { PolicyAnalyzer } from '@/app/components/PolicyAnalyzer'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ country: string }>
}

export default async function AnalyzePage({ params }: Props) {
  const { country } = await params
  
  try {
    const countryConfig = await loadCountryConfig(country)
    
    // Define API endpoints for this country
    const apiEndpoint = `/${country}/policies/analyze/api`
    const progressEndpoint = `/${country}/policies/progress/[sessionId]`
    const resultsEndpoint = `/${country}/policies/results/[sessionId]`

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">{countryConfig.flag}</span>
              <h1 className="text-3xl font-bold text-gray-900">
                Policy Analysis - {countryConfig.countryName}
              </h1>
            </div>
            <p className="text-gray-600">
              Upload your health insurance policy document for AI-powered analysis and recommendations.
            </p>
          </div>

          {/* Policy Analyzer Component */}
          <PolicyAnalyzer
            countryConfiguration={countryConfig}
            apiEndpoint={apiEndpoint}
            progressEndpoint={progressEndpoint}
            resultsEndpoint={resultsEndpoint}
            className="max-w-3xl mx-auto"
          />

          {/* Footer */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center space-x-1">
                <span>🔒</span>
                <span>Privacy Protected</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>⚡</span>
                <span>60s Analysis</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>🤖</span>
                <span>AI Powered</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error(`Failed to load country configuration for "${country}":`, error)
    notFound()
  }
}