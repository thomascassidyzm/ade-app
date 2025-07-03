# ADE Deployment Pipeline Setup

## Overview
The ADE Deployment Pipeline automatically converts APML specifications into deployed applications on Railway.

## Complete Flow
```
User Chat → APML Generation → Code Generation → GitHub Push → Railway Deploy
```

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the project root with:

```bash
# Railway API Token (required for deployment)
# Get from: https://railway.app/account/tokens
RAILWAY_TOKEN=your_railway_token_here

# GitHub Token (required for creating repos)
# Get from: https://github.com/settings/tokens
# Needs repo scope
GITHUB_TOKEN=your_github_token_here

# Claude API Key (for production chat)
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_claude_api_key_here
```

### 2. Getting Railway Token
1. Log into Railway: https://railway.app
2. Go to Account Settings → Tokens
3. Create new token with name "ADE Deployment"
4. Copy and save to `.env`

### 3. Getting GitHub Token
1. Go to: https://github.com/settings/tokens/new
2. Name: "ADE Deployment"
3. Expiration: 90 days (or custom)
4. Scopes needed:
   - `repo` (Full control of private repositories)
   - `workflow` (optional, for GitHub Actions)
5. Generate token and save to `.env`

### 4. Install Dependencies
```bash
npm install
```

### 5. Test Deployment Pipeline
```bash
node test-deployment.js
```

## Usage

### Via WebSocket
Send deployment request through WebSocket:

```javascript
// Deploy from APML
ws.send(JSON.stringify({
  type: 'deploy_apml',
  apmlMessages: [...], // Your APML specification
  options: {
    platform: 'react-web',
    env: {
      API_URL: 'https://api.myapp.com'
    }
  }
}));

// Quick deploy from description
ws.send(JSON.stringify({
  type: 'quick_deploy',
  description: 'I need a todo app with user auth and categories'
}));
```

### Via Direct API
```javascript
const orchestrator = new ADEDeploymentOrchestrator();

// Deploy from APML
const result = await orchestrator.deployFromAPML(apmlMessages, {
  platform: 'react-web'
});

// Quick deploy
const result = await orchestrator.quickDeploy(
  'Build me a task management app'
);
```

## Deployment Events

The system emits real-time events during deployment:

- `deployment_started` - Deployment initiated
- `code_generating` - Generating code from APML
- `code_generated` - Code generation complete
- `deployment_uploading` - Uploading to Railway
- `deployment_status` - Status updates
- `deployment_completed` - Deployment successful
- `deployment_failed` - Deployment failed

## Generated Project Structure

```
generated-app/
├── package.json          # Dependencies and scripts
├── railway.json          # Railway configuration
├── nixpacks.toml         # Build configuration
├── server.js             # Express server for production
├── src/
│   ├── App.js           # Main React app
│   ├── screens/         # Generated screens
│   ├── components/      # Reusable components
│   ├── services/        # API services
│   ├── models/          # Data models
│   ├── navigation/      # Router configuration
│   └── styles/          # Global styles
└── build/               # Production build (created by Railway)
```

## Troubleshooting

### Railway Deployment Fails
- Check Railway logs: `railway logs`
- Verify build command in `railway.json`
- Ensure all dependencies are in `package.json`

### GitHub Push Fails
- Verify GitHub token has `repo` scope
- Check if repository name already exists
- Ensure git is configured locally

### Code Generation Issues
- Validate APML message format
- Check for required fields in Brief message
- Ensure screens have proper component definitions

## Advanced Configuration

### Custom Deployment Settings
```javascript
{
  platform: 'react-web',      // or 'react-native', 'vue-web'
  env: {                      // Environment variables
    API_URL: 'https://...',
    FEATURE_FLAGS: 'true'
  },
  domain: 'myapp.com',        // Custom domain (Railway Pro)
  region: 'us-west-1'         // Deployment region
}
```

### Monitoring Deployments
```javascript
// Subscribe to deployment logs
orchestrator.streamDeploymentLogs(deploymentId, (log) => {
  console.log(log.type, log.message);
});

// Get deployment status
const status = orchestrator.getDeploymentStatus(deploymentId);
```

## Next Steps
1. Test with example APML specification
2. Monitor deployment through WebSocket events
3. Access deployed app via Railway URL
4. Set up custom domains if needed