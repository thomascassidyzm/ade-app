# Connecting Claude Desktop to ADE WebApp MCP Server

## Method 1: Direct HTTP Connection (Recommended)

### 1. Install MCP HTTP Server Package
```bash
npm install -g @modelcontextprotocol/server-http
```

### 2. Configure Claude Desktop
Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ade": {
      "command": "node",
      "args": ["/path/to/ade/mcp-bridge.js"],
      "env": {
        "ADE_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Method 2: Local Proxy Bridge

Create a local bridge that Claude Desktop can use:

### 1. Create Bridge Script
`mcp-bridge.js`:
```javascript
#!/usr/bin/env node
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const axios = require('axios');

const ADE_URL = process.env.ADE_URL || 'http://localhost:3000';

// Create stdio transport for Claude Desktop
const transport = new StdioServerTransport();

// Proxy requests to webapp
transport.onMessage = async (message) => {
  try {
    const response = await axios.post(`${ADE_URL}/mcp`, message);
    transport.send(response.data);
  } catch (error) {
    transport.send({
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
};

transport.start();
```

### 2. Update Claude Desktop Config
```json
{
  "mcpServers": {
    "ade": {
      "command": "node",
      "args": ["/Users/you/ade/mcp-bridge.js"],
      "env": {
        "ADE_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Method 3: Built-in WebApp MCP Mode

Run the webapp in MCP server mode:

```bash
# Start webapp normally
npm start

# In another terminal, run MCP mode
node mcp-webapp-server.js --mcp-mode
```

Then in Claude Desktop config:
```json
{
  "mcpServers": {
    "ade": {
      "command": "node",
      "args": ["mcp-webapp-server.js", "--mcp-mode"],
      "cwd": "/path/to/ade/multi-agent-system"
    }
  }
}
```

## Testing the Connection

Once configured, restart Claude Desktop. You should see "ade" in the MCP tools list.

Test with:
- "Search for authentication patterns in APML"
- "Create a todo app specification"
- "Show me the current VFS files"

## Production Setup

For production, the webapp runs on Railway/Vercel and Claude API connects directly:

```javascript
// Production: Claude API connects to your webapp
const response = await anthropic.messages.create({
  model: "claude-3-opus-20240229",
  tools: await fetch('https://your-app.railway.app/mcp/tools').then(r => r.json()),
  messages: [...]
});
```

The beauty is that the same webapp serves both:
- Claude Desktop (development) via MCP
- Claude API (production) via HTTP
- Users via the web interface

One system, multiple connection methods!