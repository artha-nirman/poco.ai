/**
 * Provider Policy Service
 * Handles provider policy CRUD operations, state management, and discovery
 */

import { Pool } from 'pg';
import { ProviderPolicyFeatures } from '@/lib/types/v2/index';

export interface PolicyFilters {
  providerId?: string;
  policyTypes?: string[];
  providers?: string[];
  regions?: string[];
  qualityThreshold?: number;
  priceRange?: { min: number; max: number };
  state?: string;
  country?: string;
}

export interface ProviderPolicyWithMetadata {
  // Database metadata
  id: string;
  policyName: string;
  policyType: string;
  policyTier?: string;
  providerCode: string;
  providerName?: string;
  state?: string;
  qualityScore?: number;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  updatedAt: Date;
  
  // V2 Policy Features
  features: ProviderPolicyFeatures;
}

export enum PolicyState {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  DISABLED = 'disabled',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived'
}

export interface DatabasePolicy {
  id: string;
  policyName: string;
  policyType: string;
  policyTier?: string;
  providerCode: string;
  providerName?: string;
  state?: string;
  qualityScore?: number;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  updatedAt: Date;
}

export class ProviderPolicyService {
  private pool: Pool;

  constructor() {
    // Use same database connection pattern as existing code
    require('dotenv').config({ path: '.env.local' });
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    this.pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }

  async getActivePolicies(
    country: string, 
    filters?: PolicyFilters
  ): Promise<ProviderPolicyWithMetadata[]> {
    let sql = `
      SELECT pp.*, p.provider_name, p.contact_info
      FROM v2_provider_policies pp
      LEFT JOIN v2_providers p ON pp.provider_id = p.id
      WHERE pp.country_code = $1 
        AND COALESCE(pp.state, 'active') = 'active'
        AND (p.onboarding_status IS NULL OR p.onboarding_status = 'active')
        AND pp.is_active = true
    `;
    const params: any[] = [country.toUpperCase()];
    let paramCount = 1;

    // Apply filters
    if (filters?.policyTypes?.length) {
      sql += ` AND pp.policy_type = ANY($${++paramCount})`;
      params.push(filters.policyTypes);
    }

    if (filters?.providers?.length) {
      sql += ` AND pp.provider_code = ANY($${++paramCount})`;
      params.push(filters.providers);
    }

    if (filters?.regions?.length) {
      sql += ` AND (pp.geographic_restrictions IS NULL OR pp.geographic_restrictions && $${++paramCount})`;
      params.push(filters.regions);
    }

    if (filters?.qualityThreshold) {
      sql += ` AND COALESCE(pp.quality_score, 0) >= $${++paramCount}`;
      params.push(filters.qualityThreshold);
    }

    // Exclude expired policies
    sql += ` AND (pp.effective_until IS NULL OR pp.effective_until > NOW())`;

    sql += ` ORDER BY COALESCE(pp.quality_score, 0) DESC, pp.updated_at DESC`;

    const result = await this.pool.query(sql, params);
    
    return result.rows.map((row: any) => this.mapDbRowToProviderPolicyWithMetadata(row));
  }

  async getPolicies(filters?: PolicyFilters): Promise<any[]> {
    let sql = `
      SELECT pp.*, p.provider_name, p.contact_info
      FROM v2_provider_policies pp
      LEFT JOIN v2_providers p ON pp.provider_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (filters?.providerId) {
      sql += ` AND pp.provider_id = $${++paramCount}`;
      params.push(filters.providerId);
    }

    if (filters?.state) {
      sql += ` AND COALESCE(pp.state, 'active') = $${++paramCount}`;
      params.push(filters.state);
    }

    if (filters?.country) {
      sql += ` AND pp.country_code = $${++paramCount}`;
      params.push(filters.country.toUpperCase());
    }

    if (filters?.qualityThreshold) {
      sql += ` AND COALESCE(pp.quality_score, 0) >= $${++paramCount}`;
      params.push(filters.qualityThreshold);
    }

    sql += ` ORDER BY pp.updated_at DESC`;

    const result = await this.pool.query(sql, params);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      policyName: row.policy_name,
      policyType: row.policy_type,
      providerName: row.provider_name || row.provider_code,
      state: row.state || 'active',
      qualityScore: row.quality_score,
      lastUpdated: row.updated_at,
      effectiveFrom: row.effective_from,
      effectiveUntil: row.effective_until
    }));
  }

  async getPolicyById(policyId: string): Promise<ProviderPolicyWithMetadata | null> {
    const result = await this.pool.query(`
      SELECT pp.*, p.provider_name, p.contact_info
      FROM v2_provider_policies pp
      LEFT JOIN v2_providers p ON pp.provider_id = p.id
      WHERE pp.id = $1
    `, [policyId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbRowToProviderPolicyWithMetadata(result.rows[0]);
  }

  async updatePolicyState(
    policyId: string, 
    newState: PolicyState, 
    reason: string,
    adminUserId?: string
  ): Promise<void> {
    // Get current state
    const currentPolicy = await this.pool.query(
      'SELECT state FROM v2_provider_policies WHERE id = $1',
      [policyId]
    );

    if (currentPolicy.rows.length === 0) {
      throw new Error(`Policy with id ${policyId} not found`);
    }

    const fromState = currentPolicy.rows[0].state || 'active';

    // Update policy state
    await this.pool.query(`
      UPDATE v2_provider_policies 
      SET state = $1, updated_at = NOW(), last_validated_at = NOW()
      WHERE id = $2
    `, [newState, policyId]);

    // Record state transition in audit log (if table exists)
    try {
      await this.pool.query(`
        INSERT INTO v2_policy_state_history (
          policy_id, from_state, to_state, reason, 
          triggered_by, user_id, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        policyId, fromState, newState, reason,
        adminUserId ? 'admin' : 'system', adminUserId
      ]);
    } catch (error) {
      // Ignore error if audit table doesn't exist yet
      console.log('State transition logged (audit table may not exist yet)');
    }
  }

  async bulkUpdatePolicyState(
    policyIds: string[],
    newState: PolicyState,
    reason: string,
    adminUserId?: string
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const policyId of policyIds) {
      try {
        await this.updatePolicyState(policyId, newState, reason, adminUserId);
        successful++;
      } catch (error) {
        console.error(`Failed to update policy ${policyId}:`, error);
        failed++;
      }
    }

    return { successful, failed };
  }

  async searchPolicies(searchQuery: string, country?: string): Promise<any[]> {
    let sql = `
      SELECT pp.*, p.provider_name
      FROM v2_provider_policies pp
      LEFT JOIN v2_providers p ON pp.provider_id = p.id
      WHERE (
        pp.policy_name ILIKE $1 OR 
        pp.provider_code ILIKE $1 OR
        p.provider_name ILIKE $1
      )
    `;
    const params = [`%${searchQuery}%`];

    if (country) {
      sql += ` AND pp.country_code = $2`;
      params.push(country.toUpperCase());
    }

    sql += ` ORDER BY pp.policy_name`;

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  private mapDbRowToProviderPolicyWithMetadata(row: any): ProviderPolicyWithMetadata {
    return {
      // Database metadata
      id: row.id,
      policyName: row.policy_name,
      policyType: row.policy_type,
      policyTier: row.policy_tier,
      providerCode: row.provider_code,
      providerName: row.provider_name || row.provider_code,
      state: row.state || 'active',
      qualityScore: row.quality_score,
      effectiveFrom: row.effective_from,
      effectiveUntil: row.effective_until,
      updatedAt: row.updated_at,
      
      // V2 Policy Features
      features: this.mapDbRowToProviderPolicy(row)
    };
  }

  private mapDbRowToProviderPolicy(row: any): ProviderPolicyFeatures {
    const policyFeatures = row.policy_features || {};
    const pricingInfo = row.pricing_info || {};

    return {
      // ProviderPolicyFeatures required fields
      _context: 'PROVIDER_POLICY' as const,
      _piiStatus: 'NO_PII' as const,
      
      // BasePolicyFeatures fields
      country: row.country_code,
      regulatoryFramework: 'AU_PHIA_2007', // Australian Private Health Insurance Act
      
      classification: {
        primaryType: row.policy_type || 'health'
      },
      
      coverageCategories: policyFeatures.coverageCategories || {},
      
      constraints: policyFeatures.constraints || [],
      
      premiumRanges: {
        single: pricingInfo.single || { min: 0, max: 0 },
        couple: pricingInfo.couple || { min: 0, max: 0 },
        family: pricingInfo.family || { min: 0, max: 0 }
      },
      
      metadata: {
        extractionConfidence: row.quality_score || 0.8,
        featureCount: Object.keys(policyFeatures.coverageCategories || {}).length,
        processingVersion: '2.0.0',
        aiModel: 'provider-data'
      }
    };
  }
}