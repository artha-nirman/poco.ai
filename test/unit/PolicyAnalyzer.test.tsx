import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PolicyAnalyzer } from '@/app/components/PolicyAnalyzer'
import type { CountryConfiguration } from '@/lib/types/v2'

// Mock fetch for component tests
global.fetch = jest.fn()

const mockAustraliaConfig: CountryConfiguration = {
  countryCode: 'AU',
  name: 'Australia',
  currency: 'AUD',
  regulations: {
    framework: 'Private Health Insurance Act 2007',
    coverageCategories: {
      hospital: { mandatory: true, minimumCoverage: 'basic' },
      extras: { mandatory: false, minimumCoverage: 'none' }
    }
  },
  version: '1.0'
}

describe('PolicyAnalyzer Component', () => {
  const defaultProps = {
    countryConfiguration: mockAustraliaConfig,
    apiEndpoint: '/api/v2/au/policies/analyze',
    progressEndpoint: '/api/v2/au/policies/progress',
    resultsEndpoint: '/api/v2/au/policies/results'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('should render policy input form', () => {
      render(<PolicyAnalyzer {...defaultProps} />)
      
      expect(screen.getByText('Analyze Your Policy')).toBeInTheDocument()
      expect(screen.getByText(/Paste your Australia insurance policy text/)).toBeInTheDocument()
      expect(screen.getByLabelText('Policy Document Text')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Analyze Policy/i })).toBeInTheDocument()
    })

    it('should display country-specific information', () => {
      render(<PolicyAnalyzer {...defaultProps} />)
      
      expect(screen.getByText(/Analysis uses Australia regulations/)).toBeInTheDocument()
      expect(screen.getByText(/Currency: AUD/)).toBeInTheDocument()
    })

    it('should have disabled submit button when no text is entered', () => {
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /Analyze Policy/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Policy Text Input', () => {
    it('should enable submit button when text is entered', async () => {
      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const textarea = screen.getByLabelText('Policy Document Text')
      const submitButton = screen.getByRole('button', { name: /Analyze Policy/i })
      
      await user.type(textarea, 'Test policy text')
      
      expect(submitButton).not.toBeDisabled()
    })

    it('should show reset button when text is entered', async () => {
      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const textarea = screen.getByLabelText('Policy Document Text')
      await user.type(textarea, 'Test policy text')
      
      expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument()
    })

    it('should clear text when reset button is clicked', async () => {
      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const textarea = screen.getByLabelText('Policy Document Text') as HTMLTextAreaElement
      await user.type(textarea, 'Test policy text')
      
      const resetButton = screen.getByRole('button', { name: /Reset/i })
      await user.click(resetButton)
      
      expect(textarea.value).toBe('')
    })
  })

  describe('Form Submission', () => {
    it('should show error when submitting empty form', async () => {
      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const form = screen.getByRole('form') || screen.getByTestId('policy-form')
      if (form) {
        fireEvent.submit(form)
      } else {
        // Fallback: try to click submit button
        const textarea = screen.getByLabelText('Policy Document Text')
        await user.type(textarea, ' ') // Add space then clear
        await user.clear(textarea)
        
        const submitButton = screen.getByRole('button', { name: /Analyze Policy/i })
        await user.click(submitButton)
      }
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter your policy text/i)).toBeInTheDocument()
      })
    })

    it('should call API with correct data when form is submitted', async () => {
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analysis_id: 'test-analysis-id',
          country: 'AU',
          country_name: 'Australia',
          policy: {
            type: 'health',
            confidence: 85,
            regulatory_compliance: { score: 90 },
            risk_assessment: { overall_risk: 'low' }
          },
          insights: {
            key_benefits: ['Test benefit'],
            potential_concerns: [],
            recommendations: ['Test recommendation']
          },
          metadata: {
            processing_time_ms: 1000,
            api_version: '2.0',
            privacy_level: 'standard'
          }
        })
      } as Response)

      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const textarea = screen.getByLabelText('Policy Document Text')
      await user.type(textarea, 'Test policy document text')
      
      const submitButton = screen.getByRole('button', { name: /Analyze Policy/i })
      await user.click(submitButton)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/v2/au/policies/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          policy_text: 'Test policy document text',
          user_preferences: {
            privacy_level: 'standard',
            analysis_depth: 'standard',
            include_comparison: true,
            highlight_concerns: true
          }
        })
      })
    })

    it('should show analyzing state when form is submitted', async () => {
      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const textarea = screen.getByLabelText('Policy Document Text')
      await user.type(textarea, 'Test policy text')
      
      const submitButton = screen.getByRole('button', { name: /Analyze Policy/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/Analyzing.../i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Results Display', () => {
    it('should display analysis results', async () => {
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analysis_id: 'test-analysis-id',
          country: 'AU',
          country_name: 'Australia',
          policy: {
            type: 'health',
            confidence: 85,
            regulatory_compliance: { score: 90 },
            risk_assessment: { overall_risk: 'low' }
          },
          insights: {
            key_benefits: ['Comprehensive coverage', 'Good value'],
            potential_concerns: ['Limited coverage area'],
            recommendations: ['Consider adding extras', 'Review excess amounts']
          },
          metadata: {
            processing_time_ms: 1500,
            api_version: '2.0',
            country_config_version: '1.0',
            privacy_level: 'standard',
            pii_protection_applied: true
          }
        })
      } as Response)

      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const textarea = screen.getByLabelText('Policy Document Text')
      await user.type(textarea, 'Test policy text')
      
      const submitButton = screen.getByRole('button', { name: /Analyze Policy/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Analysis Complete')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Australia policy analysis')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument() // Confidence score
      expect(screen.getByText('Comprehensive coverage')).toBeInTheDocument()
      expect(screen.getByText('Consider adding extras')).toBeInTheDocument()
    })

    it('should show analyze another policy button after results', async () => {
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analysis_id: 'test-analysis-id',
          country: 'AU',
          country_name: 'Australia',
          policy: {
            type: 'health',
            confidence: 85,
            regulatory_compliance: { score: 90 },
            risk_assessment: { overall_risk: 'low' }
          },
          insights: {
            key_benefits: ['Test benefit'],
            potential_concerns: [],
            recommendations: ['Test recommendation']
          },
          metadata: {
            processing_time_ms: 1000,
            api_version: '2.0',
            privacy_level: 'standard'
          }
        })
      } as Response)

      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const textarea = screen.getByLabelText('Policy Document Text')
      await user.type(textarea, 'Test policy text')
      
      const submitButton = screen.getByRole('button', { name: /Analyze Policy/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Analysis Complete')).toBeInTheDocument()
      })
      
      const analyzeAnotherButton = screen.getByRole('button', { name: /Analyze Another Policy/i })
      expect(analyzeAnotherButton).toBeInTheDocument()
      
      await user.click(analyzeAnotherButton)
      
      // Should return to input form
      expect(screen.getByText('Analyze Your Policy')).toBeInTheDocument()
      expect(screen.queryByText('Analysis Complete')).not.toBeInTheDocument()
    })
  })

  describe('Currency Formatting', () => {
    it('should format currency according to country configuration', () => {
      const sgConfig: CountryConfiguration = {
        ...mockAustraliaConfig,
        countryCode: 'SG',
        name: 'Singapore',
        currency: 'SGD'
      }
      
      render(<PolicyAnalyzer {...defaultProps} countryConfiguration={sgConfig} />)
      
      expect(screen.getByText(/Currency: SGD/)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display API error messages', async () => {
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Analysis failed',
          message: 'Policy text contains invalid content'
        })
      } as Response)

      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const textarea = screen.getByLabelText('Policy Document Text')
      await user.type(textarea, 'Test policy text')
      
      const submitButton = screen.getByRole('button', { name: /Analyze Policy/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Analysis Error')).toBeInTheDocument()
        expect(screen.getByText(/Policy text contains invalid content/)).toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const user = userEvent.setup()
      render(<PolicyAnalyzer {...defaultProps} />)
      
      const textarea = screen.getByLabelText('Policy Document Text')
      await user.type(textarea, 'Test policy text')
      
      const submitButton = screen.getByRole('button', { name: /Analyze Policy/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Analysis Error')).toBeInTheDocument()
        expect(screen.getByText(/Network error/)).toBeInTheDocument()
      })
    })
  })
})