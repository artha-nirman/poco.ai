/**
 * Provider Management Service
 * Handles provider organization CRUD operations and lifecycle management
 */

import { Pool } from 'pg';

export interface CreateProviderRequest {
  providerCode: string;
  providerName: string;
  contactInfo: Record<string, any>;
  licenseNumber?: string;
  marketTier?: 'major' | 'mid-tier' | 'specialist';
  commissionInfo?: Record<string, any>;
}

export interface Provider {
  id: string;
  providerCode: string;
  providerName: string;
  licenseNumber?: string;
  marketTier: string;
  contactInfo: Record<string, any>;
  commissionInfo?: Record<string, any>;
  onboardingStatus: string;
  onboardedAt?: Date;
  onboardedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderFilters {
  marketTier?: string;
  onboardingStatus?: string;
  countries?: string[];
  searchQuery?: string;
}

export class ProviderManagementService {
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

  async createProvider(data: CreateProviderRequest): Promise<Provider> {
    await this.validateProviderData(data);
    
    const sql = `
      INSERT INTO v2_providers (
        provider_code, provider_name, contact_info, 
        license_number, market_tier, commission_info,
        onboarding_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
      RETURNING *
    `;

    const result = await this.pool.query(sql, [
      data.providerCode,
      data.providerName,
      JSON.stringify(data.contactInfo),
      data.licenseNumber,
      data.marketTier || 'mid-tier',
      data.commissionInfo ? JSON.stringify(data.commissionInfo) : null
    ]);

    return this.mapDbRowToProvider(result.rows[0]);
  }

  async getProvider(providerId: string): Promise<Provider | null> {
    const result = await this.pool.query(
      'SELECT * FROM v2_providers WHERE id = $1',
      [providerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbRowToProvider(result.rows[0]);
  }

  async getProviders(filters?: ProviderFilters): Promise<Provider[]> {
    let sql = 'SELECT * FROM v2_providers WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters?.marketTier) {
      sql += ` AND market_tier = $${++paramCount}`;
      params.push(filters.marketTier);
    }

    if (filters?.onboardingStatus) {
      sql += ` AND onboarding_status = $${++paramCount}`;
      params.push(filters.onboardingStatus);
    }

    if (filters?.searchQuery) {
      sql += ` AND (provider_name ILIKE $${++paramCount} OR provider_code ILIKE $${++paramCount})`;
      params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
      paramCount++; // Account for the second parameter
    }

    sql += ' ORDER BY created_at DESC';

    const result = await this.pool.query(sql, params);
    return result.rows.map((row: any) => this.mapDbRowToProvider(row));
  }

  async updateProvider(providerId: string, updates: Partial<CreateProviderRequest>): Promise<Provider> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (updates.providerName) {
      updateFields.push(`provider_name = $${++paramCount}`);
      params.push(updates.providerName);
    }

    if (updates.contactInfo) {
      updateFields.push(`contact_info = $${++paramCount}`);
      params.push(JSON.stringify(updates.contactInfo));
    }

    if (updates.licenseNumber) {
      updateFields.push(`license_number = $${++paramCount}`);
      params.push(updates.licenseNumber);
    }

    if (updates.marketTier) {
      updateFields.push(`market_tier = $${++paramCount}`);
      params.push(updates.marketTier);
    }

    updateFields.push(`updated_at = NOW()`);
    
    const sql = `
      UPDATE v2_providers 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;
    params.push(providerId);

    const result = await this.pool.query(sql, params);
    if (result.rows.length === 0) {
      throw new Error(`Provider with id ${providerId} not found`);
    }

    return this.mapDbRowToProvider(result.rows[0]);
  }

  async activateProvider(providerId: string, adminUserId?: string): Promise<void> {
    await this.pool.query(`
      UPDATE v2_providers 
      SET onboarding_status = 'active', 
          onboarded_at = NOW(),
          onboarded_by = $2,
          updated_at = NOW()
      WHERE id = $1
    `, [providerId, adminUserId]);
  }

  async suspendProvider(providerId: string, reason: string): Promise<void> {
    // Update provider status
    await this.pool.query(`
      UPDATE v2_providers 
      SET onboarding_status = 'suspended', updated_at = NOW()
      WHERE id = $1
    `, [providerId]);

    // Disable all provider policies
    await this.pool.query(`
      UPDATE v2_provider_policies 
      SET state = 'disabled', updated_at = NOW()
      WHERE provider_id = $1 AND state = 'active'
    `, [providerId]);

    console.log(`Provider ${providerId} suspended. Reason: ${reason}`);
  }

  async getProviderMetrics(providerId: string): Promise<any> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total_policies,
        COUNT(*) FILTER (WHERE state = 'active') as active_policies,
        COUNT(*) FILTER (WHERE state = 'disabled') as disabled_policies,
        AVG(quality_score) as avg_quality_score
      FROM v2_provider_policies 
      WHERE provider_id = $1
    `, [providerId]);

    return result.rows[0];
  }

  private async validateProviderData(data: CreateProviderRequest): Promise<void> {
    // Check for duplicate provider code
    const existing = await this.pool.query(
      'SELECT id FROM v2_providers WHERE provider_code = $1',
      [data.providerCode]
    );

    if (existing.rows.length > 0) {
      throw new Error(`Provider with code ${data.providerCode} already exists`);
    }

    // Validate required fields
    if (!data.providerCode || !data.providerName || !data.contactInfo) {
      throw new Error('Provider code, name, and contact info are required');
    }

    // Validate provider code format (alphanumeric, max 20 chars)
    if (!/^[A-Z0-9_]{2,20}$/.test(data.providerCode)) {
      throw new Error('Provider code must be 2-20 alphanumeric characters or underscores');
    }
  }

  private mapDbRowToProvider(row: any): Provider {
    return {
      id: row.id,
      providerCode: row.provider_code,
      providerName: row.provider_name,
      licenseNumber: row.license_number,
      marketTier: row.market_tier,
      contactInfo: row.contact_info,
      commissionInfo: row.commission_info,
      onboardingStatus: row.onboarding_status,
      onboardedAt: row.onboarded_at,
      onboardedBy: row.onboarded_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}