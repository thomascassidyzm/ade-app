# Connecting Claude Desktop to Production ADE on Railway

## The Setup

Your webapp is deployed at: `https://ade-app.up.railway.app`

## For Claude Desktop to Connect to Production

### Option 1: Direct HTTPS Connection
```json
{
  "mcpServers": {
    "ade-production": {
      "command": "node",
      "args": ["/path/to/your/mcp-bridge.js"],
      "env": {
        "ADE_URL": "https://ade-app.up.railway.app"
      }
    }
  }
}
```

### Option 2: Using Environment Variables
```json
{
  "mcpServers": {
    "ade": {
      "command": "node",
      "args": ["/path/to/your/mcp-bridge.js"],
      "env": {
        "ADE_URL": "${ADE_PRODUCTION_URL}"
      }
    }
  }
}
```

Then set in your shell:
```bash
export ADE_PRODUCTION_URL="https://ade-app.up.railway.app"
```

## Security Considerations

### 1. Add API Key Authentication
Update the mcp-bridge.js:
```javascript
const API_KEY = process.env.ADE_API_KEY;

const response = await axios.post(`${ADE_URL}/mcp`, message, {
  headers: {
    'Content-Type': 'application/json',
    'X-MCP-Bridge': 'claude-desktop',
    'Authorization': `Bearer ${API_KEY}`
  }
});
```

### 2. Update Production Server
Add authentication to your Railway app:
```javascript
app.post('/mcp', express.json(), async (req, res) => {
  // Check API key
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // ... rest of MCP handling
});
```

### 3. Set Railway Environment Variables
In Railway dashboard:
```
MCP_API_KEY=your-secure-api-key-here
```

## Production Claude Desktop Config
```json
{
  "mcpServers": {
    "ade": {
      "command": "node",
      "args": ["/Users/you/ade/mcp-bridge.js"],
      "env": {
        "ADE_URL": "https://ade-app.up.railway.app",
        "ADE_API_KEY": "your-secure-api-key-here"
      }
    }
  }
}
```

## The Flow

```
Claude Desktop (your machine)
    ↓ (MCP bridge)
    ↓ (HTTPS + API Key)
Railway App (production)
    ↓
APML Tools + VFS + Visualization
```

## Benefits of This Architecture

1. **Development/Production Parity**
   - Same tools work locally and in production
   - Just change the URL

2. **Security**
   - API key authentication
   - HTTPS encryption
   - No exposed local servers

3. **Collaboration**
   - Multiple developers can use the same production MCP
   - Shared APML library
   - Consistent tooling

4. **Future: Direct Claude API Integration**
   When you move from Claude Desktop to Claude API:
   ```javascript
   // Your Railway app directly serves Claude API
   const response = await anthropic.messages.create({
     model: "claude-3-opus-20240229",
     tools: await getADETools(), // Tools from your webapp
     messages: [...]
   });
   ```

The production URL becomes your single source of truth!