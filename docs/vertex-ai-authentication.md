# Vertex AI Authentication Guide

This guide explains how to properly authenticate with Google Cloud Vertex AI in different environments.

## 🔐 Authentication Methods

### 1. **Local Development** (Recommended)
Use Google Cloud CLI authentication:

```bash
# Install Google Cloud CLI (if not installed)
# https://cloud.google.com/sdk/docs/install

# Login with your Google account
gcloud auth application-default login

# Set your project (optional but recommended)
gcloud config set project YOUR_PROJECT_ID
```

**Environment Variables for Local Dev:**
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
# GOOGLE_APPLICATION_CREDENTIALS is not needed with gcloud auth
```

### 2. **Production/Vercel Deployment** (Most Common)
Use Service Account JSON key as environment variable:

**Step 1: Create Service Account**
```bash
# Create service account
gcloud iam service-accounts create vertex-ai-service \
    --description="Service account for Vertex AI access" \
    --display-name="Vertex AI Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:vertex-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create vertex-ai-key.json \
    --iam-account=vertex-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

**Step 2: Add to Environment Variables**
```bash
# In .env.local or Vercel dashboard
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"..."}'
```

> **⚠️ Important:** The `GOOGLE_SERVICE_ACCOUNT_KEY` should be the entire JSON content as a string.

### 3. **Alternative: Credentials File Path**
Use a service account key file:

```bash
# Environment variables
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## 🏗️ How Our Implementation Works

The code checks for authentication in this order:

1. **`GOOGLE_SERVICE_ACCOUNT_KEY`** (JSON string) - Best for production
2. **`GOOGLE_APPLICATION_CREDENTIALS`** (file path) - Alternative method
3. **Application Default Credentials** - Falls back to `gcloud auth`

```typescript
// Simplified authentication logic
if (serviceAccountKey) {
  // Production: Use JSON key from env var
  const credentials = JSON.parse(serviceAccountKey);
  vertexAI = new VertexAI({
    project: projectId,
    location: 'us-central1',
    googleAuthOptions: { credentials }
  });
} else if (credentialsPath) {
  // Alternative: Use file path
  vertexAI = new VertexAI({
    project: projectId,
    location: 'us-central1',
    googleAuthOptions: { keyFilename: credentialsPath }
  });
} else {
  // Local development: Use gcloud auth
  vertexAI = new VertexAI({
    project: projectId,
    location: 'us-central1'
  });
}
```

## 🚀 Deployment Examples

### **Vercel Deployment**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `GOOGLE_CLOUD_PROJECT_ID` = `your-project-id`
   - `GOOGLE_SERVICE_ACCOUNT_KEY` = `{"type":"service_account",...}` (full JSON)

### **Other Cloud Providers**
- **Netlify:** Same environment variables in site settings
- **Railway:** Add in project variables
- **AWS/Azure:** Use their secret management services

## 🛠️ Required APIs & Permissions

### **Enable APIs:**
```bash
# Enable required APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable generativelanguage.googleapis.com
```

### **IAM Roles for Service Account:**
- `roles/aiplatform.user` - Access to Vertex AI
- `roles/ml.developer` - (Optional) For model training/deployment

## 🔍 Troubleshooting

### **Common Errors:**

**"permission denied"**
```bash
# Check if APIs are enabled
gcloud services list --enabled

# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID
```

**"credentials not found"**
- Verify environment variables are set correctly
- For local dev: run `gcloud auth list` to check authentication
- For production: verify JSON format in `GOOGLE_SERVICE_ACCOUNT_KEY`

**"quota exceeded"**
- Check Vertex AI quotas in [Google Cloud Console](https://console.cloud.google.com/iam-admin/quotas)

### **Testing Authentication:**
```bash
# Test if gcloud is working
gcloud auth print-access-token

# Test API access
gcloud ai models list --region=us-central1
```

## 📚 References

- [Google Cloud Authentication Guide](https://cloud.google.com/docs/authentication)
- [Vertex AI Node.js Client](https://cloud.google.com/nodejs/docs/reference/aiplatform/latest)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)