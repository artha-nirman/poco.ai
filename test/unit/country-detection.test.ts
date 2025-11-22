import { 
  detectCountryFromRequest,
  extractCountryFromPath,
  buildCountryUrl,
  validateCountryCode,
  hasCountryInPath,
  removeCountryFromPath
} from '@/lib/utils/country-detection'
import { NextRequest } from 'next/server'

describe('Country Detection Utilities', () => {
  describe('extractCountryFromPath', () => {
    it('should extract country code from valid paths', () => {
      expect(extractCountryFromPath('/au/policies')).toBe('AU')
      expect(extractCountryFromPath('/sg/policies/analyze')).toBe('SG')
      expect(extractCountryFromPath('/nz/about')).toBe('NZ')
    })

    it('should return null for invalid paths', () => {
      expect(extractCountryFromPath('/policies')).toBeNull()
      expect(extractCountryFromPath('/abc/policies')).toBe('ABC') // Returns as-is, validation happens elsewhere
      expect(extractCountryFromPath('/')).toBeNull()
      expect(extractCountryFromPath('')).toBeNull()
    })
  })

  describe('validateCountryCode', () => {
    it('should validate supported country codes', () => {
      expect(validateCountryCode('AU')).toBe(true)
      expect(validateCountryCode('au')).toBe(true)
      expect(validateCountryCode('SG')).toBe(true)
      expect(validateCountryCode('NZ')).toBe(true)
    })

    it('should reject unsupported country codes', () => {
      expect(validateCountryCode('US')).toBe(false)
      expect(validateCountryCode('UK')).toBe(false)
      expect(validateCountryCode('ABC')).toBe(false)
      expect(validateCountryCode('')).toBe(false)
    })
  })

  describe('hasCountryInPath', () => {
    it('should detect country codes in paths', () => {
      expect(hasCountryInPath('/au/policies')).toBe(true)
      expect(hasCountryInPath('/sg/policies/analyze')).toBe(true)
      expect(hasCountryInPath('/nz')).toBe(true)
    })

    it('should return false for paths without country codes', () => {
      expect(hasCountryInPath('/policies')).toBe(false)
      expect(hasCountryInPath('/')).toBe(false)
      expect(hasCountryInPath('/about')).toBe(false)
    })
  })

  describe('removeCountryFromPath', () => {
    it('should remove country code from path', () => {
      expect(removeCountryFromPath('/au/policies')).toBe('/policies')
      expect(removeCountryFromPath('/sg/policies/analyze')).toBe('/policies/analyze')
      expect(removeCountryFromPath('/nz')).toBe('/')
    })

    it('should return original path if no country code', () => {
      expect(removeCountryFromPath('/policies')).toBe('/policies')
      expect(removeCountryFromPath('/')).toBe('/')
      expect(removeCountryFromPath('/about')).toBe('/about')
    })
  })

  describe('buildCountryUrl', () => {
    it('should build URLs with supported countries', () => {
      expect(buildCountryUrl('https://example.com', 'AU', '/policies'))
        .toBe('https://example.com/au/policies')
      expect(buildCountryUrl('https://example.com', 'sg', 'policies'))
        .toBe('https://example.com/sg/policies')
    })

    it('should handle unsupported countries with query params', () => {
      expect(buildCountryUrl('https://example.com', 'US', '/policies'))
        .toBe('https://example.com/policies?country=us')
    })
  })

  describe('detectCountryFromRequest', () => {
    it('should detect country from URL path with highest confidence', () => {
      const request = new NextRequest('https://example.com/au/policies')
      const result = detectCountryFromRequest(request)
      
      expect(result.country).toBe('au')
      expect(result.source).toBe('url')
      expect(result.confidence).toBe(1.0)
    })

    it('should detect country from query parameter', () => {
      const request = new NextRequest('https://example.com/policies?country=SG')
      const result = detectCountryFromRequest(request)
      
      expect(result.country).toBe('sg')
      expect(result.source).toBe('query')
      expect(result.confidence).toBe(0.9)
    })

    it('should detect country from custom header', () => {
      const request = new NextRequest('https://example.com/policies', {
        headers: { 'x-poco-country': 'NZ' }
      })
      const result = detectCountryFromRequest(request)
      
      expect(result.country).toBe('nz')
      expect(result.source).toBe('header')
      expect(result.confidence).toBe(0.8)
    })

    it('should detect country from geolocation headers', () => {
      const request = new NextRequest('https://example.com/policies', {
        headers: { 'x-vercel-ip-country': 'AU' }
      })
      const result = detectCountryFromRequest(request)
      
      expect(result.country).toBe('au')
      expect(result.source).toBe('geolocation')
      expect(result.confidence).toBe(0.7)
    })

    it('should fallback to default country', () => {
      const request = new NextRequest('https://example.com/policies')
      const result = detectCountryFromRequest(request)
      
      expect(result.country).toBe('au')
      expect(result.source).toBe('default')
      expect(result.confidence).toBe(0.1)
    })

    it('should prioritize URL over other detection methods', () => {
      const request = new NextRequest('https://example.com/sg/policies?country=AU', {
        headers: { 
          'x-poco-country': 'NZ',
          'x-vercel-ip-country': 'US' 
        }
      })
      const result = detectCountryFromRequest(request)
      
      expect(result.country).toBe('sg')
      expect(result.source).toBe('url')
      expect(result.confidence).toBe(1.0)
    })

    it('should reject unsupported countries and continue detection chain', () => {
      const request = new NextRequest('https://example.com/us/policies?country=UK', {
        headers: { 
          'x-poco-country': 'CA',
          'x-vercel-ip-country': 'AU' 
        }
      })
      const result = detectCountryFromRequest(request)
      
      expect(result.country).toBe('au')
      expect(result.source).toBe('geolocation')
      expect(result.confidence).toBe(0.7)
    })
  })
})