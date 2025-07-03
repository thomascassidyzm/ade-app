// Production-ready server with explicit configuration
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const compression = require('compression');

// Import handlers
const DeploymentWebSocketHandler = require('./deployment-websocket-handler');
const VFSStorageHandler = require('./vfs-storage-handler');

// Create Express app
const app = express();

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public', { maxAge: '1h' }));

// Health check endpoint (Railway uses this)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'ade-webapp',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    app: 'ADE - APML Development Engine',
    version: '1.0.0',
    endpoints: {
      web: '/',
      mcp: '/mcp',
      websocket: 'ws://' + req.get('host')
    }
  });
});

// Static file routes
const staticFiles = {
  '/ade-design-system.css': 'ade-design-system.css',
  '/ade-nav.js': 'ade-nav.js',
  '/shared-nav-styles.css': 'shared-nav-styles.css',
  '/nav-component.js': 'nav-component.js',
  '/apml-to-live-preview.js': 'apml-to-live-preview.js',
  '/apml-app-visualizer.js': 'apml-app-visualizer.js',
  '/apml-protocol.js': 'apml-protocol.js'
};

Object.entries(staticFiles).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

// Page routes
const pages = {
  '/': 'index-home.html',
  '/chat': 'l1-orch-interface.html',
  '/visualizer': 'apml-app-flow-visualizer.html',
  '/dashboard': 'vfs-enhanced-dashboard.html',
  '/builder': 'ade-builder-interface.html',
  '/cost-calculator': 'api-cost-calculator.html'
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  // Check API key in production
  if (process.env.NODE_ENV === 'production' && process.env.MCP_API_KEY) {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (apiKey !== process.env.MCP_API_KEY) {
      return res.status(401).json({ 
        error: { code: -32001, message: 'Unauthorized' }
      });
    }
  }
  
  try {
    const { method, params, id, jsonrpc } = req.body;
    let result;
    
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'ade-webapp',
            version: '1.0.0'
          }
        };
        break;
        
      case 'tools/list':
        result = {
          tools: [
            {
              name: 'search_apml_patterns',
              description: 'Search APML pattern library',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query' }
                },
                required: ['query']
              }
            },
            {
              name: 'create_app_spec',
              description: 'Create app specification from description',
              inputSchema: {
                type: 'object',
                properties: {
                  description: { type: 'string', description: 'App description' }
                },
                required: ['description']
              }
            },
            {
              name: 'vfs_read',
              description: 'Read file from virtual file system',
              inputSchema: {
                type: 'object',
                properties: {
                  path: { type: 'string', description: 'File path' }
                },
                required: ['path']
              }
            },
            {
              name: 'vfs_write',
              description: 'Write file to virtual file system',
              inputSchema: {
                type: 'object',
                properties: {
                  path: { type: 'string', description: 'File path' },
                  content: { type: 'string', description: 'File content' }
                },
                required: ['path', 'content']
              }
            }
          ]
        };
        break;
        
      case 'tools/call':
        const { name, arguments: args } = params;
        
        // Handle tool calls
        if (name === 'search_apml_patterns') {
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify([
                { id: 'auth-basic', name: 'Basic Authentication', category: 'auth' },
                { id: 'dashboard-layout', name: 'Dashboard Layout', category: 'layout' },
                { id: 'crud-operations', name: 'CRUD Operations', category: 'data' }
              ].filter(p => 
                p.name.toLowerCase().includes(args.query.toLowerCase()) ||
                p.category.includes(args.query.toLowerCase())
              ), null, 2)
            }]
          };
        } else if (name === 'create_app_spec') {
          result = {
            content: [{
              type: 'text',
              text: `Created app specification for: ${args.description}\nSession ID: ${Date.now()}`
            }]
          };
        } else if (name === 'vfs_read') {
          // Mock VFS read
          result = {
            content: [{
              type: 'text',
              text: `// File: ${args.path}\n// Content would be here`
            }]
          };
        } else if (name === 'vfs_write') {
          // Mock VFS write
          result = {
            content: [{
              type: 'text',
              text: `File written successfully: ${args.path}`
            }]
          };
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
        break;
        
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    
    res.json({
      jsonrpc: jsonrpc || '2.0',
      id,
      result
    });
  } catch (error) {
    res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║     ADE WebApp Server Running             ║
╠═══════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(35)}║
║  Mode: ${(process.env.NODE_ENV || 'development').padEnd(35)}║
║  Time: ${new Date().toISOString().padEnd(35)}║
╠═══════════════════════════════════════════╣
║  Endpoints:                               ║
║  - Web UI:     http://localhost:${PORT.toString().padEnd(26)}║
║  - MCP API:    http://localhost:${PORT}/mcp`.padEnd(43) + `║
║  - Health:     http://localhost:${PORT}/health`.padEnd(43) + `║
║  - WebSocket:  ws://localhost:${PORT.toString().padEnd(29)}║
╚═══════════════════════════════════════════╝
  `);
});

// WebSocket setup
const wss = new WebSocket.Server({ server });

// Initialize handlers
const deploymentHandler = new DeploymentWebSocketHandler(wss);
const vfsHandler = new VFSStorageHandler('./vfs-storage');

// WebSocket connection handling
const clients = new Map();
const agents = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  console.log(`WebSocket connected: ${clientId}`);
  
  clients.set(clientId, { ws, type: null, agentId: null });
  
  // Send welcome
  ws.send(JSON.stringify({
    type: 'connection',
    clientId,
    message: 'Connected to ADE WebSocket Hub'
  }));
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      await handleWebSocketMessage(clientId, message, ws);
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client?.agentId) {
      agents.delete(client.agentId);
      broadcastAgentList();
    }
    clients.delete(clientId);
    console.log(`WebSocket disconnected: ${clientId}`);
  });
});

// WebSocket message handling
async function handleWebSocketMessage(clientId, message, ws) {
  const client = clients.get(clientId);
  
  switch (message.type) {
    case 'register_agent':
      client.type = 'agent';
      client.agentId = message.agentId;
      client.capabilities = message.capabilities;
      agents.set(message.agentId, client);
      
      ws.send(JSON.stringify({
        type: 'registered',
        status: 'success'
      }));
      
      broadcastAgentList();
      break;
      
    case 'get_agents':
      ws.send(JSON.stringify({
        type: 'agent_list',
        agents: Array.from(agents.keys())
      }));
      break;
      
    case 'vfs_operation':
      try {
        const result = await vfsHandler.handleVFSOperation(message.operation);
        ws.send(JSON.stringify({
          type: 'vfs_response',
          requestId: message.requestId,
          result
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'vfs_error',
          requestId: message.requestId,
          error: error.message
        }));
      }
      break;
  }
}

// Broadcast to all clients
function broadcastAgentList() {
  const agentList = Array.from(agents.entries()).map(([id, agent]) => ({
    agentId: id,
    capabilities: agent.capabilities,
    status: 'online'
  }));
  
  const message = JSON.stringify({
    type: 'agent_list',
    agents: agentList
  });
  
  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Export for testing
module.exports = { app, server };