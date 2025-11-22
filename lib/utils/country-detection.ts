/**
 * Country Detection Utilities
 * Smart country detection from URLs, headers, and geolocation
 */

import { NextRequest } from 'next/server'
import { isCountrySupported, getSupportedCountries } from '@/lib/config/country-loader'

const SUPPORTED_COUNTRIES = ['AU', 'SG', 'NZ'];

export interface CountryDetectionResult {
  country: string
  source: 'url' | 'query' | 'header' | 'geolocation' | 'default'
  confidence: number
}

/**
 * Extract country code from URL path (standalone function for testing)
 */
export function detectCountryFromUrl(pathname: string): string | null {
  const urlCountry = extractCountryFromPath(pathname);
  return urlCountry && isCountrySupported(urlCountry) ? urlCountry.toLowerCase() : null;
}

/**
 * Extract country code from request headers (standalone function for testing)
 */
export function detectCountryFromHeaders(headers: Headers): string | null {
  // Check custom header
  const customCountry = headers.get('x-poco-country');
  if (customCountry && isCountrySupported(customCountry)) {
    return customCountry.toLowerCase();
  }

  // Check geolocation headers (Cloudflare, Vercel, etc.)
  const geolocationCountry = headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country');
  if (geolocationCountry && isCountrySupported(geolocationCountry)) {
    return geolocationCountry.toLowerCase();
  }

  return null;
}

/**
 * Detect country from request with multiple fallback strategies
 */
export function detectCountryFromRequest(request: NextRequest): CountryDetectionResult {
  const url = new URL(request.url)
  const pathname = url.pathname
  const searchParams = url.searchParams
  
  // Strategy 1: Explicit country in URL path
  const urlCountry = extractCountryFromPath(pathname)
  if (urlCountry && isCountrySupported(urlCountry)) {
    return {
      country: urlCountry.toLowerCase(),
      source: 'url',
      confidence: 1.0
    }
  }
  
  // Strategy 2: Query parameter
  const queryCountry = searchParams.get('country')
  if (queryCountry && isCountrySupported(queryCountry)) {
    return {
      country: queryCountry.toLowerCase(),
      source: 'query', 
      confidence: 0.9
    }
  }
  
  // Strategy 3: Custom header
  const headerCountry = request.headers.get('x-poco-country')
  if (headerCountry && isCountrySupported(headerCountry)) {
    return {
      country: headerCountry.toLowerCase(),
      source: 'header',
      confidence: 0.8
    }
  }
  
  // Strategy 4: Geolocation from headers (Cloudflare, Vercel)
  const geoCountry = detectFromGeoHeaders(request)
  if (geoCountry && isCountrySupported(geoCountry)) {
    return {
      country: geoCountry.toLowerCase(),
      source: 'geolocation',
      confidence: 0.7
    }
  }
  
  // Strategy 5: Default fallback
  return {
    country: 'au', // Default to Australia
    source: 'default',
    confidence: 0.1
  }
}

/**
 * Extract country code from URL path
 */
export function extractCountryFromPath(pathname: string): string | null {
  // Match patterns like: /au/policies, /sg/policies, /nz/policies
  const countryMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/)
  return countryMatch ? countryMatch[1].toUpperCase() : null
}

/**
 * Detect country from geolocation headers
 */
function detectFromGeoHeaders(request: NextRequest): string | null {
  // Vercel Edge Functions
  const vercelCountry = request.headers.get('x-vercel-ip-country')
  if (vercelCountry) return vercelCountry
  
  // Cloudflare
  const cloudflareCountry = request.headers.get('cf-ipcountry')
  if (cloudflareCountry) return cloudflareCountry
  
  // AWS CloudFront
  const cloudfrontCountry = request.headers.get('cloudfront-viewer-country')
  if (cloudfrontCountry) return cloudfrontCountry
  
  // General IP country header
  const ipCountry = request.headers.get('x-ip-country')
  if (ipCountry) return ipCountry
  
  return null
}

/**
 * Build country-aware URL
 */
export function buildCountryUrl(baseUrl: string, country: string, path: string): string {
  const normalizedCountry = country.toLowerCase()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  if (isCountrySupported(country)) {
    return `${baseUrl}/${normalizedCountry}${normalizedPath}`
  }
  
  return `${baseUrl}${normalizedPath}?country=${normalizedCountry}`
}

/**
 * Validate country code
 */
export function validateCountryCode(country: string): boolean {
  return getSupportedCountries().includes(country.toUpperCase())
}

/**
 * Normalize country code to lowercase
 */
export function normalizeCountryCode(country: string): string {
  return country.toLowerCase()
}

/**
 * Get country display name safely
 */
export function getCountryDisplayNameSync(countryCode: string): string {
  const countryNames: Record<string, string> = {
    AU: 'Australia',
    SG: 'Singapore', 
    NZ: 'New Zealand'
  }
  
  return countryNames[countryCode.toUpperCase()] || countryCode.toUpperCase()
}

/**
 * Check if URL path contains country code
 */
export function hasCountryInPath(pathname: string): boolean {
  return extractCountryFromPath(pathname) !== null
}

/**
 * Remove country code from path (for routing)
 */
export function removeCountryFromPath(pathname: string): string {
  const countryMatch = pathname.match(/^\/[a-z]{2}(.*)$/)
  return countryMatch ? countryMatch[1] || '/' : pathname
}

/**
 * Get country-specific redirect URL
 */
export function getCountryRedirectUrl(
  originalUrl: string, 
  detectedCountry: string
): string | null {
  const url = new URL(originalUrl)
  
  // If URL already has country, no redirect needed
  if (hasCountryInPath(url.pathname)) {
    return null
  }
  
  // Add country to path for supported countries
  if (isCountrySupported(detectedCountry)) {
    url.pathname = `/${detectedCountry.toLowerCase()}${url.pathname}`
    return url.toString()
  }
  
  return null
}

/**
 * Get country configuration for a given country code
 */
export function getCountryConfiguration(countryCode: string): any | null {
  if (!isCountrySupported(countryCode)) {
    return null;
  }
  
  // Basic country configuration - in a real app this would load from database
  const configurations: Record<string, any> = {
    'AU': {
      code: 'AU',
      name: 'Australia',
      currency: 'AUD',
      regulatory_framework: 'Australian Privacy Act 1988',
      policy_types: ['hospital', 'extras', 'combined'],
      coverage_categories: ['emergency', 'dental', 'optical', 'physio'],
      providers: ['MEDIBANK', 'BUPA', 'HCF']
    },
    'SG': {
      code: 'SG', 
      name: 'Singapore',
      currency: 'SGD',
      regulatory_framework: 'Singapore PDPA',
      policy_types: ['integrated_shield', 'private_insurance'],
      coverage_categories: ['hospitalization', 'outpatient', 'dental'],
      providers: ['GREAT_EASTERN', 'AIA', 'PRUDENTIAL']
    },
    'NZ': {
      code: 'NZ',
      name: 'New Zealand', 
      currency: 'NZD',
      regulatory_framework: 'New Zealand Privacy Act 2020',
      policy_types: ['comprehensive', 'surgical', 'everyday_health'],
      coverage_categories: ['hospital', 'specialist', 'dental'],
      providers: ['SOUTHERN_CROSS', 'NIB', 'ACCURO']
    }
  };
  
  return configurations[countryCode.toUpperCase()] || null;
}

/**
 * Validate if a country is supported by the system
 */
export function validateCountrySupport(countryCode: string): boolean {
  return SUPPORTED_COUNTRIES.includes(countryCode.toUpperCase());
}