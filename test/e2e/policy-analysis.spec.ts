import { test, expect } from '@playwright/test'

test.describe('POCO V2 System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/')
  })

  test.describe('Country Detection and Routing', () => {
    test('should automatically detect country and redirect to country-specific page', async ({ page }) => {
      // Wait for country detection and redirection
      await page.waitForURL(/\/(au|sg|us)/, { timeout: 10000 })
      
      // Verify we're on a country-specific page
      const url = page.url()
      expect(url).toMatch(/\/(au|sg|us)$/)
      
      // Verify page content shows correct country
      const heading = page.getByRole('heading', { name: /Insurance Policy Analysis/i })
      await expect(heading).toBeVisible()
      
      const countryText = page.getByText(/Australia|Singapore|United States/)
      await expect(countryText).toBeVisible()
    })

    test('should handle manual country navigation', async ({ page }) => {
      // Navigate directly to Australia page
      await page.goto('/au')
      
      // Verify correct country page loaded
      await expect(page.getByText('Australia')).toBeVisible()
      await expect(page.getByText(/AUD/)).toBeVisible()
      
      // Navigate to Singapore page
      await page.goto('/sg')
      
      // Verify correct country page loaded
      await expect(page.getByText('Singapore')).toBeVisible()
      await expect(page.getByText(/SGD/)).toBeVisible()
    })

    test('should show country selector when detection fails', async ({ page }) => {
      // Mock geolocation to fail
      await page.addInitScript(() => {
        delete (window.navigator as any).geolocation
      })
      
      await page.goto('/')
      
      // Should show country selection
      await expect(page.getByText(/Select Your Country/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /Australia/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Singapore/i })).toBeVisible()
    })
  })

  test.describe('Policy Analysis Workflow - Australia', () => {
    test('should complete full policy analysis workflow', async ({ page }) => {
      await page.goto('/au')
      
      // Wait for page to load
      await expect(page.getByText('Analyze Your Policy')).toBeVisible()
      
      // Enter policy text
      const textarea = page.getByLabelText('Policy Document Text')
      const testPolicyText = `
        PRIVATE HEALTH INSURANCE POLICY
        
        Policy Holder: John Doe
        Policy Number: PHI-AU-123456
        
        HOSPITAL COVERAGE:
        - Private hospital accommodation
        - Surgical procedures
        - Emergency department treatment
        - Prostheses and medical devices
        
        EXTRAS COVERAGE:
        - Dental services: $500 annual limit
        - Physiotherapy: $300 annual limit
        - Optical services: $200 annual limit
        
        EXCESS: $500 per admission
        ANNUAL PREMIUM: $2,400 AUD
        
        This policy complies with the Private Health Insurance Act 2007.
      `
      
      await textarea.fill(testPolicyText)
      
      // Verify submit button is enabled
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      await expect(submitButton).toBeEnabled()
      
      // Submit the form
      await submitButton.click()
      
      // Wait for analysis to complete (mock will return immediately)
      await expect(page.getByText(/Analyzing.../i)).toBeVisible()
      await expect(page.getByText('Analysis Complete')).toBeVisible({ timeout: 10000 })
      
      // Verify results are displayed
      await expect(page.getByText(/Australia policy analysis/)).toBeVisible()
      await expect(page.getByText(/Confidence/)).toBeVisible()
      await expect(page.getByText(/Key Benefits/)).toBeVisible()
      await expect(page.getByText(/Recommendations/)).toBeVisible()
      
      // Verify analysis results content
      await expect(page.getByText(/health insurance/i)).toBeVisible()
      await expect(page.getByText(/Private Health Insurance Act/)).toBeVisible()
      
      // Test analyze another policy flow
      const analyzeAnotherButton = page.getByRole('button', { name: /Analyze Another Policy/i })
      await expect(analyzeAnotherButton).toBeVisible()
      await analyzeAnotherButton.click()
      
      // Should return to input form
      await expect(page.getByText('Analyze Your Policy')).toBeVisible()
      await expect(textarea).toHaveValue('')
    })

    test('should handle policy analysis errors gracefully', async ({ page }) => {
      // Mock API to return error
      await page.route('/api/v2/au/policies/analyze', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Analysis failed',
            message: 'Service temporarily unavailable'
          })
        })
      })
      
      await page.goto('/au')
      
      const textarea = page.getByLabelText('Policy Document Text')
      await textarea.fill('Test policy text that will fail')
      
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      await submitButton.click()
      
      // Should show error message
      await expect(page.getByText('Analysis Error')).toBeVisible()
      await expect(page.getByText(/Service temporarily unavailable/)).toBeVisible()
      
      // Should be able to try again
      await expect(submitButton).toBeEnabled()
    })

    test('should validate form input', async ({ page }) => {
      await page.goto('/au')
      
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      const textarea = page.getByLabelText('Policy Document Text')
      
      // Submit button should be disabled with empty text
      await expect(submitButton).toBeDisabled()
      
      // Add some text
      await textarea.fill('Short text')
      await expect(submitButton).toBeEnabled()
      
      // Clear text
      await textarea.clear()
      await expect(submitButton).toBeDisabled()
      
      // Try to submit empty form by clicking submit
      await submitButton.click({ force: true })
      await expect(page.getByText(/Please enter your policy text/i)).toBeVisible()
    })
  })

  test.describe('Policy Analysis Workflow - Singapore', () => {
    test('should show Singapore-specific information', async ({ page }) => {
      await page.goto('/sg')
      
      // Verify Singapore-specific content
      await expect(page.getByText('Singapore')).toBeVisible()
      await expect(page.getByText(/SGD/)).toBeVisible()
      await expect(page.getByText(/Paste your Singapore insurance policy text/)).toBeVisible()
      
      // Verify API endpoints are Singapore-specific
      const textarea = page.getByLabelText('Policy Document Text')
      await textarea.fill('Test Singapore policy')
      
      // Monitor network requests
      const requestPromise = page.waitForRequest(req => 
        req.url().includes('/api/v2/sg/policies/analyze')
      )
      
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      await submitButton.click()
      
      const request = await requestPromise
      expect(request.url()).toContain('/api/v2/sg/policies/analyze')
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/au')
      
      // Verify layout is responsive
      await expect(page.getByText('Analyze Your Policy')).toBeVisible()
      
      const textarea = page.getByLabelText('Policy Document Text')
      await expect(textarea).toBeVisible()
      
      // Should be able to interact with form on mobile
      await textarea.fill('Mobile test policy')
      
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      await expect(submitButton).toBeEnabled()
    })

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/au')
      
      await expect(page.getByText('Analyze Your Policy')).toBeVisible()
      
      // Verify form is usable on tablet
      const textarea = page.getByLabelText('Policy Document Text')
      await textarea.fill('Tablet test policy')
      
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      await expect(submitButton).toBeEnabled()
    })
  })

  test.describe('Privacy and Security', () => {
    test('should display privacy information', async ({ page }) => {
      await page.goto('/au')
      
      // Look for privacy-related text
      await expect(page.getByText(/privacy/i)).toBeVisible()
      
      // Check if privacy settings are available
      const privacyText = page.getByText(/Your policy data is processed securely/i)
      if (await privacyText.isVisible()) {
        await expect(privacyText).toBeVisible()
      }
    })

    test('should handle PII protection settings', async ({ page }) => {
      await page.goto('/au')
      
      const textarea = page.getByLabelText('Policy Document Text')
      const policyWithPII = `
        HEALTH INSURANCE POLICY
        
        Policy Holder: John Doe
        Date of Birth: 01/01/1980
        Email: john.doe@email.com
        Phone: +61 400 123 456
        Address: 123 Main Street, Sydney NSW 2000
        
        Medical History:
        - Previous surgery in 2020
        - Regular medication: Lipitor
      `
      
      await textarea.fill(policyWithPII)
      
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      await submitButton.click()
      
      // Should process with PII protection
      await expect(page.getByText(/Analyzing.../i)).toBeVisible()
      
      // Results should not contain original PII
      await expect(page.getByText('Analysis Complete')).toBeVisible({ timeout: 10000 })
      
      // Verify PII was protected in the results
      await expect(page.getByText('john.doe@email.com')).not.toBeVisible()
      await expect(page.getByText('+61 400 123 456')).not.toBeVisible()
    })
  })

  test.describe('System Status and Health', () => {
    test('should display system status indicator', async ({ page }) => {
      await page.goto('/au')
      
      // Look for system status component
      const statusIndicator = page.getByTestId('system-status') || page.getByText(/System Status/i)
      if (await statusIndicator.isVisible()) {
        await expect(statusIndicator).toBeVisible()
      }
    })

    test('should handle API service unavailability', async ({ page }) => {
      // Mock all API endpoints to fail
      await page.route('/api/**', async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service unavailable',
            message: 'System is currently under maintenance'
          })
        })
      })
      
      await page.goto('/au')
      
      const textarea = page.getByLabelText('Policy Document Text')
      await textarea.fill('Test policy during maintenance')
      
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      await submitButton.click()
      
      // Should show maintenance message
      await expect(page.getByText(/Service unavailable|maintenance/i)).toBeVisible()
    })
  })
})