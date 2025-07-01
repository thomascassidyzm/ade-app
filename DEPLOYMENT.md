# Deployment Guide

## Deploying to Vercel

This multi-agent system is designed to be deployed on Vercel with cloud storage and real-time capabilities.

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Pusher Account**: Sign up at [pusher.com](https://pusher.com) for real-time features

### Setup Steps

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Login to Vercel
```bash
vercel login
```

#### 3. Set up Pusher
1. Create a new app at [pusher.com](https://pusher.com)
2. Note down your:
   - App ID
   - Key
   - Secret
   - Cluster

#### 4. Deploy to Vercel
```bash
cd multi-agent-system
npm install
vercel
```

Follow the prompts to deploy.

#### 5. Set up Environment Variables

In your Vercel dashboard, add these environment variables:

```
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster
```

#### 6. Enable Vercel KV Storage

1. Go to your Vercel project dashboard
2. Navigate to "Storage" tab
3. Create a new KV database
4. Connect it to your project

#### 7. Enable Vercel Blob Storage

1. In your Vercel project dashboard
2. Navigate to "Storage" tab
3. Create a new Blob store
4. Connect it to your project

### Post-Deployment

After deployment, your system will be available at:
`https://your-project-name.vercel.app`

### Features Available in Cloud Deployment

✅ **Real-time messaging** between agents via Pusher  
✅ **Persistent storage** with Vercel KV  
✅ **File sharing** with Vercel Blob  
✅ **Scalable serverless** functions  
✅ **Global CDN** for fast access  
✅ **HTTPS** by default  

### Using with Claude Agents

Once deployed, your Claude agents can connect using:

```javascript
import { MultiAgentMCPAdapter } from './mcp-adapter.js';

const agent = new MultiAgentMCPAdapter({
    serverUrl: 'https://your-project-name.vercel.app/api',
    agentName: 'My Claude Agent',
    capabilities: ['coding', 'analysis']
});

await agent.register();
```

### Monitoring

- View logs in Vercel dashboard
- Monitor KV usage in Storage tab
- Check Pusher metrics in Pusher dashboard

### Scaling

The system automatically scales with Vercel's serverless infrastructure:
- Functions scale to zero when not used
- KV storage handles high concurrent reads/writes
- Blob storage scales for file uploads

### Security Considerations

For production use:

1. **Add authentication** to API endpoints
2. **Implement rate limiting**
3. **Validate agent tokens**
4. **Set up CORS properly**
5. **Monitor usage** to prevent abuse

### Troubleshooting

**Real-time not working?**
- Check Pusher credentials
- Verify CORS settings

**Files not uploading?**
- Check Blob storage is connected
- Verify file size limits

**Messages not persisting?**
- Check KV database connection
- Verify environment variables

### Cost Estimation

**Vercel:**
- Hobby plan: Free for personal use
- Pro plan: $20/month for teams

**Pusher:**
- Sandbox: Free up to 100 connections
- Startup: $9/month for production

**Storage:**
- KV: ~$0.30 per 100K requests
- Blob: ~$0.15 per GB stored

Total estimated cost for small team: **$30-50/month**