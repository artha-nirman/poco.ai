/**
 * Smart Routing Middleware
 * Handles country detection and URL routing for international support
 */

import { NextRequest, NextResponse } from 'next/server'
import type { NextMiddleware } from 'next/server'
import { detectCountryFromRequest, getCountryRedirectUrl, hasCountryInPath } from '@/lib/utils/country-detection'

/**
 * Middleware for smart country-based routing
 */
export const middleware: NextMiddleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static assets and API routes
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next()
  }
  
  // If URL already has country, continue normally
  if (hasCountryInPath(pathname)) {
    return NextResponse.next()
  }
  
  // Detect country and handle routing
  const countryResult = detectCountryFromRequest(request)
  
  // For root path, redirect to country selection
  if (pathname === '/') {
    return NextResponse.next() // Let root page handle country selection
  }
  
  // For other paths, try to redirect to country-specific URL
  const redirectUrl = getCountryRedirectUrl(request.url, countryResult.country)
  
  if (redirectUrl) {
    const response = NextResponse.redirect(redirectUrl, 302)
    
    // Add country detection headers for debugging
    response.headers.set('x-poco-detected-country', countryResult.country)
    response.headers.set('x-poco-detection-source', countryResult.source)
    response.headers.set('x-poco-detection-confidence', countryResult.confidence.toString())
    
    return response
  }
  
  // Continue with original request if no redirect needed
  return NextResponse.next()
}

/**
 * Check if middleware should be skipped for this path
 */
function shouldSkipMiddleware(pathname: string): boolean {
  // Skip for static assets
  if (pathname.startsWith('/static/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.startsWith('/robots.txt') ||
      pathname.startsWith('/sitemap.xml')) {
    return true
  }
  
  // Skip for API routes that don't need country routing
  if (pathname.startsWith('/api/system/') ||
      pathname.startsWith('/api/test/') ||
      pathname.startsWith('/api/docs') ||
      pathname.startsWith('/api/openapi.json') ||
      pathname.startsWith('/api/privacy') ||
      pathname.startsWith('/api/v2/')) {
    return true
  }
  
  // Skip for V2 country-specific API routes (they already have country in path)
  if (pathname.match(/^\/[a-z]{2}\/policies\/(analyze|progress|results)/)) {
    return true
  }
  
  // Skip for file extensions
  if (pathname.includes('.') && !pathname.endsWith('.html')) {
    return true
  }
  
  return false
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/system (system APIs)
     * - api/test (test APIs) 
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/system|api/test|_next/static|_next/image|favicon.ico).*)',
  ],
}