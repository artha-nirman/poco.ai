# Developer Integration Guide - Poco.ai V2

## Quick Start

Get started with Poco.ai V2 in under 5 minutes.

### 1. Basic Policy Analysis

```bash
curl -X POST https://poco.ai/api/v2/au/policies/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "policy_text": "Hospital Insurance Policy\nProvider: HCF\nPremium: $250/month..."
  }'
```

### 2. Check Progress

```bash
curl https://poco.ai/api/v2/au/policies/progress/{session_id}
```

### 3. Get Results

```bash
curl https://poco.ai/api/v2/au/policies/results/{session_id}
```

---

## Language-Specific SDKs

### JavaScript/TypeScript

#### Installation

```bash
npm install @poco/sdk-js
# or
yarn add @poco/sdk-js
```

#### Basic Usage

```typescript
import { PocoClient } from '@poco/sdk-js';

const client = new PocoClient({
  baseUrl: 'https://poco.ai/api/v2',
  country: 'AU'
});

// Analyze policy
const analysis = await client.analyzePolicy({
  policyText: document.policyText,
  preferences: {
    maxPremium: 300,
    preferredProviders: ['MEDIBANK', 'BUPA'],
    comparisonCount: 5
  }
});

// Real-time progress
analysis.onProgress((progress) => {
  console.log(`${progress.stage}: ${progress.progress}%`);
  updateProgressBar(progress.progress);
});

// Handle completion
analysis.onComplete(async (sessionId) => {
  const results = await analysis.getResults();
  displayResults(results);
});

// Handle errors
analysis.onError((error) => {
  console.error('Analysis failed:', error.message);
  showErrorMessage(error.suggestion);
});
```

#### Advanced Usage with React

```tsx
import React, { useState, useCallback } from 'react';
import { usePocoAnalysis } from '@poco/sdk-react';

interface PolicyAnalysisProps {
  countryCode: string;
}

export const PolicyAnalysis: React.FC<PolicyAnalysisProps> = ({ countryCode }) => {
  const [policyText, setPolicyText] = useState('');
  const [preferences, setPreferences] = useState({
    maxPremium: 400,
    preferredProviders: ['MEDIBANK', 'BUPA', 'HCF'],
    comparisonCount: 5
  });

  const {
    analyze,
    progress,
    results,
    error,
    isLoading,
    isCompleted
  } = usePocoAnalysis({
    country: countryCode,
    onProgress: (progress) => {
      console.log(`Analysis ${progress.progress}% complete`);
    }
  });

  const handleAnalyze = useCallback(async () => {
    if (!policyText.trim()) {
      alert('Please enter your policy text');
      return;
    }

    try {
      await analyze({
        policyText,
        userPreferences: preferences,
        analysisOptions: {
          includeCostComparison: true,
          includeFeatureGapAnalysis: true,
          priorityWeights: {
            cost: 0.4,
            coverage: 0.4,
            providerReputation: 0.1,
            customerService: 0.1
          }
        }
      });
    } catch (err) {
      console.error('Failed to start analysis:', err);
    }
  }, [policyText, preferences, analyze]);

  return (
    <div className="policy-analysis">
      <div className="input-section">
        <textarea
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
          placeholder="Paste your insurance policy document here..."
          rows={10}
          cols={80}
        />
        
        <div className="preferences">
          <label>
            Max Premium: $
            <input
              type="number"
              value={preferences.maxPremium}
              onChange={(e) => setPreferences({
                ...preferences,
                maxPremium: Number(e.target.value)
              })}
            />
          </label>
          
          <label>
            Preferred Providers:
            <select
              multiple
              value={preferences.preferredProviders}
              onChange={(e) => setPreferences({
                ...preferences,
                preferredProviders: Array.from(e.target.selectedOptions, option => option.value)
              })}
            >
              <option value="MEDIBANK">Medibank</option>
              <option value="BUPA">BUPA</option>
              <option value="HCF">HCF</option>
              <option value="NIB">nib</option>
              <option value="AHSA">Australian Health Service Alliance</option>
            </select>
          </label>
        </div>
        
        <button 
          onClick={handleAnalyze}
          disabled={isLoading || !policyText.trim()}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Policy'}
        </button>
      </div>

      {isLoading && (
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress?.progress || 0}%` }}
            />
          </div>
          <p>{progress?.message}</p>
          <small>
            {progress?.estimatedTimeRemaining 
              ? `${Math.ceil(progress.estimatedTimeRemaining / 60)} minutes remaining`
              : 'Calculating time remaining...'
            }
          </small>
        </div>
      )}

      {error && (
        <div className="error-section">
          <h3>Analysis Failed</h3>
          <p>{error.message}</p>
          {error.suggestion && <p><strong>Suggestion:</strong> {error.suggestion}</p>}
        </div>
      )}

      {isCompleted && results && (
        <div className="results-section">
          <h3>Analysis Results</h3>
          
          <div className="current-policy">
            <h4>Your Current Policy</h4>
            <p>Type: {results.userPolicy.detectedType}</p>
            <p>Tier: {results.userPolicy.detectedTier}</p>
            <p>Premium: ${results.userPolicy.currentPremium.amount}/{results.userPolicy.currentPremium.frequency}</p>
          </div>

          <div className="recommendations">
            <h4>Recommendations</h4>
            {results.recommendations.map((rec, index) => (
              <div key={index} className="recommendation-card">
                <h5>{rec.provider.name} - {rec.policy.name}</h5>
                <p>Score: {rec.comparisonScores.overallScore}/100</p>
                <p>Premium: ${rec.policy.premium.amount}/{rec.policy.premium.frequency}</p>
                
                {rec.costAnalysis.premiumDifference.amount < 0 && (
                  <p className="savings">
                    Save ${Math.abs(rec.costAnalysis.premiumDifference.annualSavings)} annually!
                  </p>
                )}
                
                <div className="improvements">
                  <h6>Key Improvements:</h6>
                  <ul>
                    {Object.entries(rec.featureComparison).map(([category, comparison]) => 
                      comparison.improvements.map((improvement, idx) => (
                        <li key={`${category}-${idx}`}>{improvement}</li>
                      ))
                    )}
                  </ul>
                </div>
                
                <div className="considerations">
                  <h6>Important Considerations:</h6>
                  <ul>
                    {rec.switchingConsiderations.waitingPeriodsImpact.map((impact, idx) => (
                      <li key={idx}>{impact}</li>
                    ))}
                  </ul>
                </div>
                
                <button 
                  onClick={() => window.open(rec.provider.contactInfo.website, '_blank')}
                >
                  Contact {rec.provider.name}
                </button>
              </div>
            ))}
          </div>

          <div className="summary">
            <h4>Summary</h4>
            <p>Best recommendation: {results.recommendations[results.summary.bestOverallRecommendation].provider.name}</p>
            <p>Potential annual savings: ${results.summary.potentialAnnualSavings}</p>
            
            <div className="next-steps">
              <h5>Next Steps:</h5>
              <ol>
                {results.summary.nextSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

#### Vue.js Integration

```vue
<template>
  <div class="policy-analyzer">
    <form @submit.prevent="analyzePolicy">
      <div class="form-group">
        <label for="policy-text">Policy Document Text:</label>
        <textarea
          id="policy-text"
          v-model="policyText"
          :disabled="isAnalyzing"
          rows="10"
          placeholder="Paste your insurance policy document here..."
        ></textarea>
      </div>
      
      <div class="preferences-group">
        <h3>Preferences</h3>
        <div class="form-row">
          <label>
            Max Premium: $
            <input 
              type="number" 
              v-model.number="preferences.maxPremium"
              :disabled="isAnalyzing"
            />
          </label>
          <label>
            Comparison Count:
            <select v-model.number="preferences.comparisonCount" :disabled="isAnalyzing">
              <option value="3">3 recommendations</option>
              <option value="5">5 recommendations</option>
              <option value="8">8 recommendations</option>
            </select>
          </label>
        </div>
      </div>
      
      <button type="submit" :disabled="isAnalyzing || !policyText.trim()">
        {{ isAnalyzing ? 'Analyzing...' : 'Analyze Policy' }}
      </button>
    </form>

    <div v-if="progress" class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress.progress + '%' }"></div>
      </div>
      <p>{{ progress.message }}</p>
      <div class="stages">
        <div 
          v-for="stage in progress.stages" 
          :key="stage.name"
          :class="['stage', stage.status]"
        >
          {{ stage.name.replace('_', ' ') }}
        </div>
      </div>
    </div>

    <div v-if="error" class="error-section">
      <h3>Error</h3>
      <p>{{ error.message }}</p>
      <p v-if="error.suggestion"><strong>Suggestion:</strong> {{ error.suggestion }}</p>
    </div>

    <div v-if="results" class="results-section">
      <h3>Analysis Results</h3>
      
      <div class="summary-cards">
        <div class="summary-card">
          <h4>Potential Savings</h4>
          <p class="amount">${{ results.summary.potentialAnnualSavings }}</p>
          <small>per year</small>
        </div>
        
        <div class="summary-card">
          <h4>Best Match</h4>
          <p>{{ bestRecommendation.provider.name }}</p>
          <small>{{ bestRecommendation.comparisonScores.overallScore }}% match</small>
        </div>
      </div>

      <div class="recommendations-grid">
        <div 
          v-for="(recommendation, index) in results.recommendations" 
          :key="index"
          class="recommendation-card"
          :class="{ 'best-match': index === results.summary.bestOverallRecommendation }"
        >
          <h4>{{ recommendation.provider.name }}</h4>
          <h5>{{ recommendation.policy.name }}</h5>
          
          <div class="scores">
            <div class="score">
              <span class="label">Overall</span>
              <span class="value">{{ recommendation.comparisonScores.overallScore }}%</span>
            </div>
            <div class="score">
              <span class="label">Cost</span>
              <span class="value">{{ recommendation.comparisonScores.costScore }}%</span>
            </div>
            <div class="score">
              <span class="label">Coverage</span>
              <span class="value">{{ recommendation.comparisonScores.coverageScore }}%</span>
            </div>
          </div>
          
          <div class="cost-analysis">
            <p>Premium: ${{ recommendation.policy.premium.amount }}/{{ recommendation.policy.premium.frequency }}</p>
            <p v-if="recommendation.costAnalysis.premiumDifference.amount < 0" class="savings">
              Save ${{ Math.abs(recommendation.costAnalysis.premiumDifference.annualSavings) }} annually
            </p>
            <p v-else-if="recommendation.costAnalysis.premiumDifference.amount > 0" class="cost-increase">
              ${{ recommendation.costAnalysis.premiumDifference.annualSavings }} more annually
            </p>
          </div>
          
          <button 
            @click="contactProvider(recommendation.provider)"
            class="contact-button"
          >
            Contact {{ recommendation.provider.name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePocoClient } from '@poco/sdk-vue';
import type { V2AnalysisResponse, PolicyRecommendation } from '@poco/sdk-js';

const props = defineProps<{
  country: string;
}>();

const { client } = usePocoClient({
  country: props.country
});

const policyText = ref('');
const isAnalyzing = ref(false);
const progress = ref(null);
const results = ref<V2AnalysisResponse | null>(null);
const error = ref(null);

const preferences = ref({
  maxPremium: 400,
  comparisonCount: 5,
  preferredProviders: ['MEDIBANK', 'BUPA', 'HCF']
});

const bestRecommendation = computed((): PolicyRecommendation | null => {
  if (!results.value) return null;
  return results.value.recommendations[results.value.summary.bestOverallRecommendation];
});

const analyzePolicy = async () => {
  if (!policyText.value.trim()) {
    alert('Please enter your policy text');
    return;
  }

  isAnalyzing.value = true;
  error.value = null;
  results.value = null;
  progress.value = null;

  try {
    const analysis = await client.analyzePolicy({
      policyText: policyText.value,
      userPreferences: preferences.value,
      analysisOptions: {
        includeCostComparison: true,
        includeFeatureGapAnalysis: true
      }
    });

    analysis.onProgress((progressData) => {
      progress.value = progressData;
    });

    analysis.onComplete(async () => {
      results.value = await analysis.getResults();
      isAnalyzing.value = false;
    });

    analysis.onError((err) => {
      error.value = err;
      isAnalyzing.value = false;
    });

  } catch (err) {
    error.value = err;
    isAnalyzing.value = false;
  }
};

const contactProvider = (provider) => {
  window.open(provider.contactInfo.website, '_blank');
};
</script>
```

---

### Python

#### Installation

```bash
pip install poco-sdk
```

#### Basic Usage

```python
from poco_sdk import PocoClient
import asyncio

client = PocoClient(
    base_url='https://poco.ai/api/v2',
    country='AU'
)

async def analyze_policy():
    # Start analysis
    session = await client.analyze_policy(
        policy_text="""
        Hospital Insurance Policy
        Provider: HCF
        Premium: $280.50 monthly
        Coverage Tier: Gold Hospital
        Excess: $500
        
        Hospital Benefits:
        - Private room guarantee
        - Emergency surgery
        - Cardiac procedures
        - Cancer treatment
        """,
        user_preferences={
            'max_premium': 350,
            'preferred_providers': ['MEDIBANK', 'BUPA', 'NIB'],
            'comparison_count': 5
        },
        analysis_options={
            'include_cost_comparison': True,
            'include_feature_gap_analysis': True,
            'priority_weights': {
                'cost': 0.3,
                'coverage': 0.5,
                'provider_reputation': 0.1,
                'customer_service': 0.1
            }
        }
    )
    
    # Monitor progress
    def on_progress(progress):
        print(f"{progress['stage']}: {progress['progress']}%")
        print(f"Message: {progress['message']}")
        if progress.get('estimated_time_remaining'):
            print(f"ETA: {progress['estimated_time_remaining']} seconds")
        print("---")
    
    # Wait for completion
    results = await session.wait_for_results(on_progress=on_progress)
    
    print("\n=== ANALYSIS COMPLETE ===")
    print(f"Confidence Score: {results['analysis_metadata']['confidence_score']:.1%}")
    print(f"Processing Time: {results['analysis_metadata']['processing_time_ms']/1000:.1f}s")
    
    # Display current policy info
    user_policy = results['user_policy']
    print(f"\nYour Current Policy:")
    print(f"  Provider: {user_policy['provider_info']['current_provider']}")
    print(f"  Type: {user_policy['detected_type'].title()}")
    print(f"  Tier: {user_policy['detected_tier'].title()}")
    print(f"  Premium: ${user_policy['current_premium']['amount']}/{user_policy['current_premium']['frequency']}")
    print(f"  Excess: ${user_policy['excess_info']['hospital_excess']}")
    
    # Display recommendations
    print(f"\nTop {len(results['recommendations'])} Recommendations:")
    for i, rec in enumerate(results['recommendations'], 1):
        print(f"\n{i}. {rec['provider']['name']} - {rec['policy']['name']}")
        print(f"   Overall Score: {rec['comparison_scores']['overall_score']}/100")
        print(f"   Premium: ${rec['policy']['premium']['amount']}/{rec['policy']['premium']['frequency']}")
        
        cost_analysis = rec['cost_analysis']
        if cost_analysis['premium_difference']['amount'] < 0:
            print(f"   💰 Save ${abs(cost_analysis['premium_difference']['annual_savings'])} annually")
        elif cost_analysis['premium_difference']['amount'] > 0:
            print(f"   📈 ${cost_analysis['premium_difference']['annual_savings']} more annually")
        else:
            print(f"   ➡️  Similar cost")
        
        print(f"   📞 Contact: {rec['provider']['contact_info']['phone']}")
        print(f"   🌐 Website: {rec['provider']['contact_info']['website']}")
    
    # Display summary
    summary = results['summary']
    print(f"\n=== SUMMARY ===")
    print(f"Best Overall: {results['recommendations'][summary['best_overall_recommendation']]['provider']['name']}")
    print(f"Max Annual Savings: ${summary['potential_annual_savings']}")
    
    print(f"\nKey Improvements:")
    for improvement in summary['key_improvements']:
        print(f"  ✅ {improvement}")
    
    print(f"\nImportant Considerations:")
    for consideration in summary['important_considerations']:
        print(f"  ⚠️  {consideration}")
    
    print(f"\nNext Steps:")
    for i, step in enumerate(summary['next_steps'], 1):
        print(f"  {i}. {step}")

# Run the analysis
if __name__ == "__main__":
    asyncio.run(analyze_policy())
```

#### Django Integration

```python
# views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from poco_sdk import PocoClient
import json
import asyncio

client = PocoClient(
    base_url='https://poco.ai/api/v2',
    country='AU'  # Default country
)

@csrf_exempt
@require_http_methods(["POST"])
async def start_policy_analysis(request):
    try:
        data = json.loads(request.body)
        
        # Extract request data
        policy_text = data.get('policy_text')
        country = data.get('country', 'AU')
        preferences = data.get('user_preferences', {})
        
        if not policy_text:
            return JsonResponse({
                'error': 'Policy text is required'
            }, status=400)
        
        # Start analysis
        session = await client.analyze_policy(
            policy_text=policy_text,
            user_preferences=preferences,
            country=country
        )
        
        return JsonResponse({
            'session_id': session.session_id,
            'status': 'processing',
            'progress_url': f'/api/progress/{session.session_id}/',
            'results_url': f'/api/results/{session.session_id}/'
        })
        
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)

@require_http_methods(["GET"])
async def get_analysis_progress(request, session_id):
    try:
        progress = await client.get_progress(session_id)
        return JsonResponse(progress)
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=404)

@require_http_methods(["GET"])
async def get_analysis_results(request, session_id):
    try:
        results = await client.get_results(session_id)
        return JsonResponse(results)
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=404)

# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('analyze/', views.start_policy_analysis, name='start_analysis'),
    path('progress/<str:session_id>/', views.get_analysis_progress, name='get_progress'),
    path('results/<str:session_id>/', views.get_analysis_results, name='get_results'),
]
```

#### FastAPI Integration

```python
# main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from poco_sdk import PocoClient
import asyncio

app = FastAPI(title="Policy Analysis API")

client = PocoClient(
    base_url='https://poco.ai/api/v2',
    country='AU'
)

class AnalysisRequest(BaseModel):
    policy_text: str
    country: str = "AU"
    user_preferences: Optional[dict] = None
    analysis_options: Optional[dict] = None

class ProgressResponse(BaseModel):
    session_id: str
    stage: str
    progress: int
    message: str
    estimated_time_remaining: Optional[int]

@app.post("/analyze", response_model=dict)
async def analyze_policy(request: AnalysisRequest):
    try:
        session = await client.analyze_policy(
            policy_text=request.policy_text,
            user_preferences=request.user_preferences or {},
            analysis_options=request.analysis_options or {},
            country=request.country
        )
        
        return {
            "session_id": session.session_id,
            "status": "processing",
            "progress_url": f"/progress/{session.session_id}",
            "results_url": f"/results/{session.session_id}"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/progress/{session_id}", response_model=ProgressResponse)
async def get_progress(session_id: str):
    try:
        progress = await client.get_progress(session_id)
        return progress
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/results/{session_id}")
async def get_results(session_id: str):
    try:
        results = await client.get_results(session_id)
        return results
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

### PHP

#### Installation

```bash
composer require poco/sdk-php
```

#### Basic Usage

```php
<?php
require_once 'vendor/autoload.php';

use Poco\SDK\PocoClient;
use Poco\SDK\Models\AnalysisRequest;

$client = new PocoClient([
    'baseUrl' => 'https://poco.ai/api/v2',
    'country' => 'AU'
]);

$request = new AnalysisRequest([
    'policyText' => "
        Hospital Insurance Policy
        Provider: HCF
        Premium: $280.50 monthly
        Coverage Tier: Gold Hospital
        Excess: $500
        
        Hospital Benefits:
        - Private room guarantee
        - Emergency surgery
        - Cardiac procedures
    ",
    'userPreferences' => [
        'maxPremium' => 350,
        'preferredProviders' => ['MEDIBANK', 'BUPA'],
        'comparisonCount' => 5
    ]
]);

try {
    // Start analysis
    $session = $client->analyzePolicy($request);
    
    echo "Analysis started with session ID: {$session->getSessionId()}\n";
    echo "Progress URL: {$session->getProgressUrl()}\n";
    
    // Monitor progress
    while (!$session->isComplete()) {
        $progress = $session->getProgress();
        
        echo sprintf(
            "[%s] %d%% - %s\n",
            $progress->getStage(),
            $progress->getProgress(),
            $progress->getMessage()
        );
        
        if ($progress->getEstimatedTimeRemaining()) {
            echo "ETA: {$progress->getEstimatedTimeRemaining()} seconds\n";
        }
        
        sleep(5); // Wait 5 seconds before next check
    }
    
    // Get results
    $results = $session->getResults();
    
    echo "\n=== ANALYSIS COMPLETE ===\n";
    echo "Confidence: " . ($results->getAnalysisMetadata()->getConfidenceScore() * 100) . "%\n";
    
    // Display current policy
    $userPolicy = $results->getUserPolicy();
    echo "\nYour Current Policy:\n";
    echo "  Provider: {$userPolicy->getProviderInfo()->getCurrentProvider()}\n";
    echo "  Type: {$userPolicy->getDetectedType()}\n";
    echo "  Premium: $" . $userPolicy->getCurrentPremium()->getAmount() . "/" . $userPolicy->getCurrentPremium()->getFrequency() . "\n";
    
    // Display recommendations
    echo "\nRecommendations:\n";
    foreach ($results->getRecommendations() as $i => $rec) {
        $num = $i + 1;
        echo "\n{$num}. {$rec->getProvider()->getName()} - {$rec->getPolicy()->getName()}\n";
        echo "   Score: {$rec->getComparisonScores()->getOverallScore()}/100\n";
        echo "   Premium: $" . $rec->getPolicy()->getPremium()->getAmount() . "/" . $rec->getPolicy()->getPremium()->getFrequency() . "\n";
        
        $costDiff = $rec->getCostAnalysis()->getPremiumDifference()->getAmount();
        if ($costDiff < 0) {
            echo "   💰 Save $" . abs($rec->getCostAnalysis()->getPremiumDifference()->getAnnualSavings()) . " annually\n";
        }
        
        echo "   📞 " . $rec->getProvider()->getContactInfo()->getPhone() . "\n";
        echo "   🌐 " . $rec->getProvider()->getContactInfo()->getWebsite() . "\n";
    }
    
    // Display summary
    $summary = $results->getSummary();
    echo "\n=== SUMMARY ===\n";
    echo "Max Savings: $" . $summary->getPotentialAnnualSavings() . "\n";
    
    echo "\nNext Steps:\n";
    foreach ($summary->getNextSteps() as $i => $step) {
        $num = $i + 1;
        echo "  {$num}. {$step}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
```

#### Laravel Integration

```php
<?php
// app/Services/PolicyAnalysisService.php
namespace App\Services;

use Poco\SDK\PocoClient;
use Poco\SDK\Models\AnalysisRequest;
use App\Models\PolicyAnalysis;

class PolicyAnalysisService
{
    private PocoClient $client;

    public function __construct()
    {
        $this->client = new PocoClient([
            'baseUrl' => config('poco.base_url'),
            'country' => config('poco.default_country', 'AU')
        ]);
    }

    public function startAnalysis(string $policyText, array $preferences = [], string $country = 'AU'): PolicyAnalysis
    {
        $request = new AnalysisRequest([
            'policyText' => $policyText,
            'userPreferences' => $preferences,
            'country' => $country
        ]);

        $session = $this->client->analyzePolicy($request);

        // Store in database
        $analysis = PolicyAnalysis::create([
            'session_id' => $session->getSessionId(),
            'country' => $country,
            'status' => 'processing',
            'user_id' => auth()->id(),
            'policy_text' => $policyText,
            'preferences' => json_encode($preferences)
        ]);

        return $analysis;
    }

    public function getProgress(string $sessionId): array
    {
        $analysis = PolicyAnalysis::where('session_id', $sessionId)->firstOrFail();
        $progress = $this->client->getProgress($sessionId);

        // Update status in database
        $analysis->update([
            'status' => $progress->getStage(),
            'progress' => $progress->getProgress()
        ]);

        return [
            'session_id' => $sessionId,
            'stage' => $progress->getStage(),
            'progress' => $progress->getProgress(),
            'message' => $progress->getMessage(),
            'estimated_time_remaining' => $progress->getEstimatedTimeRemaining()
        ];
    }

    public function getResults(string $sessionId): array
    {
        $analysis = PolicyAnalysis::where('session_id', $sessionId)->firstOrFail();
        $results = $this->client->getResults($sessionId);

        // Store results in database
        $analysis->update([
            'status' => 'completed',
            'progress' => 100,
            'results' => json_encode($results->toArray()),
            'completed_at' => now()
        ]);

        return $results->toArray();
    }
}

// app/Http/Controllers/PolicyAnalysisController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PolicyAnalysisService;
use App\Http\Requests\StartAnalysisRequest;

class PolicyAnalysisController extends Controller
{
    private PolicyAnalysisService $analysisService;

    public function __construct(PolicyAnalysisService $analysisService)
    {
        $this->analysisService = $analysisService;
    }

    public function store(StartAnalysisRequest $request)
    {
        $analysis = $this->analysisService->startAnalysis(
            $request->policy_text,
            $request->user_preferences ?? [],
            $request->country ?? 'AU'
        );

        return response()->json([
            'session_id' => $analysis->session_id,
            'status' => 'processing',
            'progress_url' => route('analysis.progress', $analysis->session_id),
            'results_url' => route('analysis.results', $analysis->session_id)
        ], 202);
    }

    public function progress(string $sessionId)
    {
        try {
            $progress = $this->analysisService->getProgress($sessionId);
            return response()->json($progress);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    public function results(string $sessionId)
    {
        try {
            $results = $this->analysisService->getResults($sessionId);
            return response()->json($results);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }
}
```

---

### Ruby

#### Installation

```bash
gem install poco-sdk
```

#### Basic Usage

```ruby
require 'poco-sdk'

client = Poco::Client.new(
  base_url: 'https://poco.ai/api/v2',
  country: 'AU'
)

# Start analysis
session = client.analyze_policy(
  policy_text: """
    Hospital Insurance Policy
    Provider: HCF
    Premium: $280.50 monthly
    Coverage Tier: Gold Hospital
    Excess: $500
    
    Hospital Benefits:
    - Private room guarantee
    - Emergency surgery
    - Cardiac procedures
  """,
  user_preferences: {
    max_premium: 350,
    preferred_providers: ['MEDIBANK', 'BUPA'],
    comparison_count: 5
  }
)

puts "Analysis started: #{session.session_id}"
puts "Progress URL: #{session.progress_url}"

# Monitor progress
session.on_progress do |progress|
  puts "[#{progress.stage}] #{progress.progress}% - #{progress.message}"
  puts "ETA: #{progress.estimated_time_remaining} seconds" if progress.estimated_time_remaining
end

# Wait for completion
results = session.wait_for_completion

puts "\n=== ANALYSIS COMPLETE ==="
puts "Confidence: #{(results.analysis_metadata.confidence_score * 100).round(1)}%"

# Display current policy
user_policy = results.user_policy
puts "\nYour Current Policy:"
puts "  Provider: #{user_policy.provider_info.current_provider}"
puts "  Type: #{user_policy.detected_type.capitalize}"
puts "  Premium: $#{user_policy.current_premium.amount}/#{user_policy.current_premium.frequency}"

# Display recommendations
puts "\nRecommendations:"
results.recommendations.each_with_index do |rec, i|
  puts "\n#{i + 1}. #{rec.provider.name} - #{rec.policy.name}"
  puts "   Score: #{rec.comparison_scores.overall_score}/100"
  puts "   Premium: $#{rec.policy.premium.amount}/#{rec.policy.premium.frequency}"
  
  if rec.cost_analysis.premium_difference.amount < 0
    puts "   💰 Save $#{rec.cost_analysis.premium_difference.annual_savings.abs} annually"
  end
  
  puts "   📞 #{rec.provider.contact_info.phone}"
  puts "   🌐 #{rec.provider.contact_info.website}"
end

# Display summary
summary = results.summary
puts "\n=== SUMMARY ==="
puts "Max Savings: $#{summary.potential_annual_savings}"

puts "\nNext Steps:"
summary.next_steps.each_with_index do |step, i|
  puts "  #{i + 1}. #{step}"
end
```

#### Rails Integration

```ruby
# app/services/policy_analysis_service.rb
class PolicyAnalysisService
  def initialize
    @client = Poco::Client.new(
      base_url: Rails.application.config.poco.base_url,
      country: Rails.application.config.poco.default_country || 'AU'
    )
  end

  def start_analysis(policy_text, preferences = {}, country = 'AU')
    session = @client.analyze_policy(
      policy_text: policy_text,
      user_preferences: preferences,
      country: country
    )

    # Store in database
    PolicyAnalysis.create!(
      session_id: session.session_id,
      country: country,
      status: 'processing',
      user_id: Current.user&.id,
      policy_text: policy_text,
      preferences: preferences
    )
  end

  def get_progress(session_id)
    analysis = PolicyAnalysis.find_by!(session_id: session_id)
    progress = @client.get_progress(session_id)

    # Update status
    analysis.update!(
      status: progress.stage,
      progress: progress.progress
    )

    progress.to_h
  end

  def get_results(session_id)
    analysis = PolicyAnalysis.find_by!(session_id: session_id)
    results = @client.get_results(session_id)

    # Store results
    analysis.update!(
      status: 'completed',
      progress: 100,
      results: results.to_h,
      completed_at: Time.current
    )

    results.to_h
  end
end

# app/controllers/policy_analyses_controller.rb
class PolicyAnalysesController < ApplicationController
  before_action :set_analysis_service

  def create
    analysis = @service.start_analysis(
      params[:policy_text],
      params[:user_preferences] || {},
      params[:country] || 'AU'
    )

    render json: {
      session_id: analysis.session_id,
      status: 'processing',
      progress_url: progress_policy_analysis_url(analysis.session_id),
      results_url: policy_analysis_url(analysis.session_id)
    }, status: :accepted
  end

  def progress
    progress = @service.get_progress(params[:id])
    render json: progress
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Session not found' }, status: :not_found
  end

  def show
    results = @service.get_results(params[:id])
    render json: results
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Session not found' }, status: :not_found
  end

  private

  def set_analysis_service
    @service = PolicyAnalysisService.new
  end
end
```

---

## Webhook Integration

Configure webhooks to receive notifications when analysis completes:

### Setup Webhook

```javascript
// Configure webhook endpoint
const webhook = await client.configureWebhook({
  url: 'https://your-app.com/webhooks/poco',
  events: ['analysis_completed', 'analysis_failed'],
  secret: 'your-webhook-secret'
});
```

### Webhook Handler

```javascript
// Express.js webhook handler
app.post('/webhooks/poco', express.raw({type: 'application/json'}), (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-poco-signature'];
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.POCO_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(payload);
  
  switch (event.event) {
    case 'analysis_completed':
      handleAnalysisCompleted(event);
      break;
    case 'analysis_failed':
      handleAnalysisFailed(event);
      break;
    default:
      console.log('Unknown event:', event.event);
  }
  
  res.status(200).send('OK');
});

function handleAnalysisCompleted(event) {
  // Fetch results and notify user
  fetch(event.results_url)
    .then(response => response.json())
    .then(results => {
      // Send email notification, update UI, etc.
      notifyUser(event.session_id, results);
    });
}
```

---

## Error Handling Best Practices

### Common Error Scenarios

```javascript
// Handle different error types
try {
  const analysis = await client.analyzePolicy({...});
  const results = await analysis.getResults();
} catch (error) {
  switch (error.code) {
    case 'INVALID_POLICY_TEXT':
      showError('Please provide a valid policy document');
      break;
      
    case 'UNSUPPORTED_COUNTRY':
      showError('This country is not currently supported');
      break;
      
    case 'RATE_LIMIT_EXCEEDED':
      showError('Too many requests. Please try again in a few minutes');
      setTimeout(() => retryAnalysis(), error.retryAfter * 1000);
      break;
      
    case 'AI_SERVICE_UNAVAILABLE':
      showError('Analysis service temporarily unavailable. Please try again');
      break;
      
    case 'SESSION_NOT_FOUND':
      showError('Session expired. Please start a new analysis');
      break;
      
    default:
      showError('An unexpected error occurred. Please try again');
      console.error('Poco API Error:', error);
  }
}
```

### Retry Logic

```javascript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Usage
const results = await retryWithBackoff(async () => {
  return await client.getResults(sessionId);
});
```

---

## Performance Optimization

### Caching Strategies

```javascript
// Cache country configurations
const configCache = new Map();

async function getCachedCountryConfig(country) {
  if (!configCache.has(country)) {
    const config = await client.getCountryConfiguration(country);
    configCache.set(country, config);
  }
  return configCache.get(country);
}

// Cache provider data
const Redis = require('redis');
const redis = Redis.createClient();

async function getCachedProviders(country) {
  const cacheKey = `providers:${country}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const providers = await client.getProviders(country);
  await redis.setex(cacheKey, 3600, JSON.stringify(providers)); // Cache for 1 hour
  
  return providers;
}
```

### Connection Pooling

```python
# Python connection pooling
from poco_sdk import PocoClient
import asyncio
import aiohttp

class PocoClientPool:
    def __init__(self, pool_size=10):
        self.semaphore = asyncio.Semaphore(pool_size)
        self.connector = aiohttp.TCPConnector(limit=pool_size)
        
    async def analyze_policy(self, **kwargs):
        async with self.semaphore:
            client = PocoClient(connector=self.connector)
            return await client.analyze_policy(**kwargs)

# Usage
pool = PocoClientPool(pool_size=20)
results = await pool.analyze_policy(policy_text=text)
```

---

## Testing

### Unit Tests

```javascript
// Jest unit tests
import { PocoClient } from '@poco/sdk-js';

const mockClient = new PocoClient({
  baseUrl: 'http://localhost:3000/api/v2',
  country: 'AU',
  mock: true
});

describe('PocoClient', () => {
  test('should analyze policy successfully', async () => {
    const analysis = await mockClient.analyzePolicy({
      policyText: 'Test policy text...',
      userPreferences: {
        maxPremium: 300
      }
    });
    
    expect(analysis.sessionId).toBeDefined();
    expect(analysis.status).toBe('processing');
  });
  
  test('should handle invalid policy text', async () => {
    await expect(mockClient.analyzePolicy({
      policyText: 'x' // Too short
    })).rejects.toThrow('Policy text must be at least 100 characters');
  });
});
```

### Integration Tests

```python
# Python integration tests
import pytest
from poco_sdk import PocoClient

@pytest.mark.asyncio
async def test_full_analysis_flow():
    client = PocoClient(
        base_url='https://staging.poco.ai/api/v2',
        country='AU'
    )
    
    # Start analysis
    session = await client.analyze_policy(
        policy_text=get_test_policy_text(),
        user_preferences={'max_premium': 400}
    )
    
    assert session.session_id
    
    # Wait for completion
    results = await session.wait_for_results(timeout=300)
    
    assert results['analysis_metadata']['confidence_score'] > 0.7
    assert len(results['recommendations']) > 0
    assert results['summary']['potential_annual_savings'] >= 0
```

---

## Support and Resources

- **API Documentation**: https://docs.poco.ai/v2
- **OpenAPI Spec**: https://poco.ai/api/v2/openapi.yaml
- **SDK Repositories**:
  - JavaScript/TypeScript: https://github.com/poco-ai/sdk-js
  - Python: https://github.com/poco-ai/sdk-python
  - PHP: https://github.com/poco-ai/sdk-php
  - Ruby: https://github.com/poco-ai/sdk-ruby
- **Community Forum**: https://community.poco.ai
- **Status Page**: https://status.poco.ai

---

*Last updated: November 22, 2025*