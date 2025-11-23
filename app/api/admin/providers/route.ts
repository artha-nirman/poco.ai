/**
 * Provider Management API Routes
 * Handles CRUD operations for providers and their policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProviderManagementService } from '@/lib/services/provider-management';
import { ProviderPolicyService, PolicyState } from '@/lib/services/provider-policy';

const providerService = new ProviderManagementService();
const policyService = new ProviderPolicyService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        const status = searchParams.get('status');
        const providers = await providerService.getProviders({ 
          onboardingStatus: status || undefined 
        });
        return NextResponse.json(providers);

      case 'policies':
        const providerId = searchParams.get('providerId');
        const country = searchParams.get('country');
        const policies = await policyService.getActivePolicies(
          country || 'AU',
          providerId ? { providerId } : undefined
        );
        return NextResponse.json(policies);

      case 'stats':
        const statsProviderId = searchParams.get('providerId');
        if (statsProviderId) {
          const stats = await providerService.getProviderMetrics(statsProviderId);
          return NextResponse.json(stats);
        } else {
          // Return overall stats if no specific provider
          const allProviders = await providerService.getProviders({});
          const overallStats = {
            total: allProviders.length,
            active: allProviders.filter(p => p.onboardingStatus === 'active').length,
            pending: allProviders.filter(p => p.onboardingStatus === 'pending').length,
            suspended: allProviders.filter(p => p.onboardingStatus === 'suspended').length
          };
          return NextResponse.json(overallStats);
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Provider API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    switch (action) {
      case 'create':
        const newProvider = await providerService.createProvider(body);
        return NextResponse.json(newProvider, { status: 201 });

      case 'activate':
        const { providerId } = body;
        await providerService.activateProvider(providerId);
        return NextResponse.json({ success: true, message: 'Provider activated' });

      case 'suspend':
        const { providerId: suspendId, reason } = body;
        await providerService.suspendProvider(suspendId, reason);
        return NextResponse.json({ success: true, message: 'Provider suspended' });

      case 'update-policy-state':
        const { policyId, newState, reason: stateReason } = body;
        await policyService.updatePolicyState(
          policyId,
          newState as PolicyState,
          stateReason
        );
        return NextResponse.json({ 
          success: true, 
          message: `Policy state updated to ${newState}` 
        });

      case 'bulk-policy-update':
        const { policyIds, state, reason: bulkReason } = body;
        const result = await policyService.bulkUpdatePolicyState(
          policyIds,
          state as PolicyState,
          bulkReason
        );
        return NextResponse.json(result);

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Provider API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const updates = await request.json();
    const updatedProvider = await providerService.updateProvider(providerId, updates);
    
    return NextResponse.json(updatedProvider);
  } catch (error) {
    console.error('Provider API PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Delete operation not implemented. Use suspend instead.' },
    { status: 501 }
  );
}