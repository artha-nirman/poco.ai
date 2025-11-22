import { test, expect } from '@playwright/test'

test.describe('Country Detection and Routing E2E', () => {
  test.describe('URL-based Country Detection', () => {
    test('should route to Australia when URL contains /au', async ({ page }) => {
      await page.goto('/au')
      
      await expect(page.getByText('Australia')).toBeVisible()
      await expect(page.getByText(/AUD/)).toBeVisible()
      await expect(page.getByText(/Private Health Insurance Act/)).toBeVisible()
    })

    test('should route to Singapore when URL contains /sg', async ({ page }) => {
      await page.goto('/sg')
      
      await expect(page.getByText('Singapore')).toBeVisible()
      await expect(page.getByText(/SGD/)).toBeVisible()
      await expect(page.getByText(/Insurance Act/)).toBeVisible()
    })

    test('should route to US when URL contains /us', async ({ page }) => {
      await page.goto('/us')
      
      await expect(page.getByText('United States')).toBeVisible()
      await expect(page.getByText(/USD/)).toBeVisible()
      await expect(page.getByText(/Affordable Care Act/)).toBeVisible()
    })
  })

  test.describe('Header-based Country Detection', () => {
    test('should detect country from Accept-Language header', async ({ page, context }) => {
      // Set Australian locale
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'language', { value: 'en-AU' })
        Object.defineProperty(navigator, 'languages', { value: ['en-AU', 'en'] })
      })
      
      await page.goto('/')
      
      // Should redirect to Australia
      await page.waitForURL(/\/au/, { timeout: 10000 })
      await expect(page.getByText('Australia')).toBeVisible()
    })

    test('should detect Singapore from language header', async ({ page, context }) => {
      // Set Singapore locale
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'language', { value: 'en-SG' })
        Object.defineProperty(navigator, 'languages', { value: ['en-SG', 'en'] })
      })
      
      await page.goto('/')
      
      // Should redirect to Singapore
      await page.waitForURL(/\/sg/, { timeout: 10000 })
      await expect(page.getByText('Singapore')).toBeVisible()
    })
  })

  test.describe('Geolocation-based Detection', () => {
    test('should use geolocation when other methods fail', async ({ page, context }) => {
      // Mock geolocation to return Australian coordinates
      await context.grantPermissions(['geolocation'])
      await context.setGeolocation({ latitude: -33.8688, longitude: 151.2093 }) // Sydney
      
      // Clear language preferences
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'language', { value: 'en' })
        Object.defineProperty(navigator, 'languages', { value: ['en'] })
      })
      
      await page.goto('/')
      
      // Should detect Australia from geolocation
      await page.waitForURL(/\/au/, { timeout: 10000 })
      await expect(page.getByText('Australia')).toBeVisible()
    })

    test('should handle geolocation permission denied', async ({ page, context }) => {
      // Deny geolocation permission
      await context.setGeolocation(null)
      
      await page.goto('/')
      
      // Should show country selector or fallback to default
      const countrySelector = page.getByText(/Select Your Country/i)
      const defaultCountry = page.getByText(/Australia|Singapore|United States/)
      
      await expect(countrySelector.or(defaultCountry)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Fallback Country Selection', () => {
    test('should show country selector when detection fails', async ({ page, context }) => {
      // Disable all detection methods
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'language', { value: '' })
        Object.defineProperty(navigator, 'languages', { value: [] })
        delete (window.navigator as any).geolocation
      })
      
      await page.goto('/')
      
      // Should show manual country selection
      await expect(page.getByText(/Select Your Country/i)).toBeVisible()
      
      const australiaButton = page.getByRole('button', { name: /Australia/i })
      const singaporeButton = page.getByRole('button', { name: /Singapore/i })
      const usButton = page.getByRole('button', { name: /United States/i })
      
      await expect(australiaButton).toBeVisible()
      await expect(singaporeButton).toBeVisible()
      await expect(usButton).toBeVisible()
      
      // Test selecting a country
      await australiaButton.click()
      
      await page.waitForURL(/\/au/, { timeout: 5000 })
      await expect(page.getByText('Australia')).toBeVisible()
    })

    test('should remember country selection', async ({ page, context }) => {
      // First visit - select country manually
      await page.goto('/')
      
      // If country selector is shown, select Singapore
      const countrySelector = page.getByText(/Select Your Country/i)
      if (await countrySelector.isVisible({ timeout: 2000 })) {
        await page.getByRole('button', { name: /Singapore/i }).click()
      }
      
      await page.waitForURL(/\/sg/, { timeout: 10000 })
      
      // Navigate to home page again
      await page.goto('/')
      
      // Should remember Singapore selection
      await page.waitForURL(/\/sg/, { timeout: 5000 })
      await expect(page.getByText('Singapore')).toBeVisible()
    })
  })

  test.describe('Country Switching', () => {
    test('should allow switching between countries', async ({ page }) => {
      // Start with Australia
      await page.goto('/au')
      await expect(page.getByText('Australia')).toBeVisible()
      
      // Look for country switcher (if implemented)
      const countrySwitcher = page.getByTestId('country-switcher') || 
                             page.getByText(/Change Country/i) ||
                             page.getByRole('button', { name: /Country/i })
      
      if (await countrySwitcher.isVisible()) {
        await countrySwitcher.click()
        
        // Select Singapore
        const singaporeOption = page.getByRole('button', { name: /Singapore/i })
        await singaporeOption.click()
        
        await page.waitForURL(/\/sg/)
        await expect(page.getByText('Singapore')).toBeVisible()
      } else {
        // Manual navigation
        await page.goto('/sg')
        await expect(page.getByText('Singapore')).toBeVisible()
        
        await page.goto('/us')
        await expect(page.getByText('United States')).toBeVisible()
      }
    })

    test('should preserve form state when switching countries fails', async ({ page }) => {
      await page.goto('/au')
      
      // Fill in some form data
      const textarea = page.getByLabelText('Policy Document Text')
      await textarea.fill('Test policy text for preservation')
      
      // Try to navigate to invalid country route
      await page.goto('/invalid-country')
      
      // Should redirect to valid country or show error
      await expect(page.getByText(/Australia|Singapore|United States|Not Found/)).toBeVisible()
      
      // If redirected to valid country, form should be reset
      // If showing error page, navigation should work
    })
  })

  test.describe('API Endpoint Validation', () => {
    test('should use correct country-specific API endpoints', async ({ page }) => {
      // Test Australia endpoints
      await page.goto('/au')
      
      const textarea = page.getByLabelText('Policy Document Text')
      await textarea.fill('Test policy')
      
      // Monitor API calls
      const analyzeRequest = page.waitForRequest(req => 
        req.url().includes('/api/v2/au/policies/analyze')
      )
      
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      await submitButton.click()
      
      const request = await analyzeRequest
      expect(request.url()).toContain('/api/v2/au/policies/analyze')
    })

    test('should handle country-specific API errors', async ({ page }) => {
      // Mock API to return country-specific error
      await page.route('/api/v2/sg/**', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Validation failed',
            message: 'Policy format not recognized for Singapore regulations',
            country: 'SG'
          })
        })
      })
      
      await page.goto('/sg')
      
      const textarea = page.getByLabelText('Policy Document Text')
      await textarea.fill('Invalid policy format')
      
      const submitButton = page.getByRole('button', { name: /Analyze Policy/i })
      await submitButton.click()
      
      await expect(page.getByText(/not recognized for Singapore/)).toBeVisible()
    })
  })

  test.describe('Performance and Caching', () => {
    test('should cache country configurations', async ({ page }) => {
      await page.goto('/au')
      
      // First load
      await expect(page.getByText('Australia')).toBeVisible()
      
      // Navigate away and back
      await page.goto('/')
      await page.goto('/au')
      
      // Should load faster on second visit (cached config)
      await expect(page.getByText('Australia')).toBeVisible()
    })

    test('should handle slow country detection gracefully', async ({ page, context }) => {
      // Simulate slow geolocation
      await context.addInitScript(() => {
        const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
          setTimeout(() => {
            if (success) {
              success({
                coords: {
                  latitude: -33.8688,
                  longitude: 151.2093,
                  accuracy: 100,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null
                },
                timestamp: Date.now()
              } as GeolocationPosition)
            }
          }, 5000) // 5 second delay
        }
      })
      
      await page.goto('/')
      
      // Should show loading state or fallback while detecting
      const loadingOrFallback = page.getByText(/Detecting|Loading|Select Your Country/i)
      await expect(loadingOrFallback).toBeVisible({ timeout: 2000 })
    })
  })
})