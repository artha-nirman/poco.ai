/**
 * Country Configuration Loader
 * Loads and validates country-specific regulatory configurations
 */

import { CountryConfiguration } from '../types/v2/index';

// Cache for loaded configurations
const configCache = new Map<string, CountryConfiguration>();

/**
 * Load country configuration from JSON file
 */
export async function loadCountryConfig(countryCode: string): Promise<CountryConfiguration> {
  const normalizedCode = countryCode.toUpperCase();
  
  // Check cache first
  if (configCache.has(normalizedCode)) {
    return configCache.get(normalizedCode)!;
  }
  
  try {
    // Dynamic import of country configuration
    const config = await import(`./countries/${normalizedCode.toLowerCase()}.json`);
    
    // Validate configuration structure
    validateCountryConfig(config.default);
    
    // Cache and return
    configCache.set(normalizedCode, config.default);
    return config.default;
    
  } catch (error) {
    throw new Error(`Failed to load country configuration for ${countryCode}: ${error}`);
  }
}

/**
 * Get list of supported countries
 */
export function getSupportedCountries(): string[] {
  return ['AU', 'SG', 'NZ'];
}

/**
 * Check if country is supported
 */
export function isCountrySupported(countryCode: string): boolean {
  return getSupportedCountries().includes(countryCode.toUpperCase());
}

/**
 * Validate country configuration structure
 */
function validateCountryConfig(config: any): asserts config is CountryConfiguration {
  if (!config) {
    throw new Error('Configuration is null or undefined');
  }
  
  // Required fields validation
  const requiredFields = ['countryCode', 'countryName', 'currency', 'regulatoryFramework'];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate regulatory framework
  if (!config.regulatoryFramework.frameworkName) {
    throw new Error('Missing regulatory framework name');
  }
  
  // Validate policy types
  if (!Array.isArray(config.policyTypes) || config.policyTypes.length === 0) {
    throw new Error('Policy types must be a non-empty array');
  }
  
  // Validate tier systems
  if (!Array.isArray(config.tierSystems)) {
    throw new Error('Tier systems must be an array');
  }
  
  // Validate coverage categories
  if (!Array.isArray(config.coverageCategories)) {
    throw new Error('Coverage categories must be an array');
  }
}

/**
 * Get country configuration with fallback
 */
export async function getCountryConfigWithFallback(countryCode?: string): Promise<CountryConfiguration> {
  // Default to Australia if no country specified
  const targetCountry = countryCode || 'AU';
  
  try {
    return await loadCountryConfig(targetCountry);
  } catch (error) {
    console.warn(`Failed to load config for ${targetCountry}, falling back to AU:`, error);
    
    // Fallback to Australia
    if (targetCountry !== 'AU') {
      return await loadCountryConfig('AU');
    }
    
    // If even AU fails, throw error
    throw new Error(`Cannot load any country configuration: ${error}`);
  }
}

/**
 * Get localized display name for country
 */
export async function getCountryDisplayName(countryCode: string): Promise<string> {
  try {
    const config = await loadCountryConfig(countryCode);
    return config.countryName;
  } catch {
    return countryCode.toUpperCase();
  }
}

/**
 * Get currency for country
 */
export async function getCountryCurrency(countryCode: string): Promise<string> {
  try {
    const config = await loadCountryConfig(countryCode);
    return config.currency;
  } catch {
    return 'USD'; // Default fallback
  }
}

/**
 * Clear configuration cache (useful for testing)
 */
export function clearConfigCache(): void {
  configCache.clear();
}

/**
 * Preload all supported country configurations
 */
export async function preloadAllConfigs(): Promise<void> {
  const promises = getSupportedCountries().map(country => 
    loadCountryConfig(country).catch(error => {
      console.warn(`Failed to preload config for ${country}:`, error);
    })
  );
  
  await Promise.all(promises);
}

// Type guard for country configuration
export function isValidCountryConfig(obj: any): obj is CountryConfiguration {
  try {
    validateCountryConfig(obj);
    return true;
  } catch {
    return false;
  }
}

// Alias for backward compatibility
export const getCountryConfiguration = loadCountryConfig;