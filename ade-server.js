/**
 * ADE Server - The ONE server that runs everything
 * Clean architecture, no legacy code
 */

const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Main app route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes
const api = express.Router();

// Health check
api.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'ade-server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Agent management
const agents = new Map();

api.post('/agents/register', (req, res) => {
  const { id, name, capabilities } = req.body;
  
  if (!id || !name || !capabilities) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const agent = {
    id,
    name,
    capabilities,
    status: 'online',
    registeredAt: new Date().toISOString()
  };
  
  agents.set(id, agent);
  res.json({ success: true, agent });
});

api.get('/agents', (req, res) => {
  res.json({
    agents: Array.from(agents.values()),
    count: agents.size
  });
});

// VFS (Virtual File System) - Simple in-memory for now
const vfs = new Map();

api.post('/vfs/write', (req, res) => {
  const { path, content } = req.body;
  
  if (!path || !content) {
    return res.status(400).json({ error: 'Path and content required' });
  }
  
  vfs.set(path, {
    content,
    updatedAt: new Date().toISOString()
  });
  
  res.json({ success: true, path });
});

api.get('/vfs/read/:path(*)', (req, res) => {
  const file = vfs.get(req.params.path);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.json(file);
});

api.get('/vfs/list', (req, res) => {
  res.json({
    files: Array.from(vfs.keys()),
    count: vfs.size
  });
});

// MCP (Model Context Protocol) endpoint
api.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;
  
  try {
    let result;
    
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'ade-server',
            version: '1.0.0'
          },
          capabilities: {
            tools: {},
            resources: {}
          }
        };
        break;
        
      case 'tools/list':
        result = {
          tools: [
            {
              name: 'create_agent',
              description: 'Create a new ADE agent',
              inputSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  capabilities: { type: 'array', items: { type: 'string' } }
                },
                required: ['name', 'capabilities']
              }
            },
            {
              name: 'write_file',
              description: 'Write to virtual file system',
              inputSchema: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  content: { type: 'string' }
                },
                required: ['path', 'content']
              }
            }
          ]
        };
        break;
        
      case 'tools/call':
        // Handle tool calls
        const tool = params.name;
        const args = params.arguments;
        
        if (tool === 'create_agent') {
          const agentId = `agent-${Date.now()}`;
          agents.set(agentId, {
            id: agentId,
            ...args,
            status: 'online',
            registeredAt: new Date().toISOString()
          });
          result = {
            content: [{
              type: 'text',
              text: `Created agent ${agentId} with capabilities: ${args.capabilities.join(', ')}`
            }]
          };
        } else if (tool === 'write_file') {
          vfs.set(args.path, {
            content: args.content,
            updatedAt: new Date().toISOString()
          });
          result = {
            content: [{
              type: 'text',
              text: `File written to ${args.path}`
            }]
          };
        } else {
          throw new Error(`Unknown tool: ${tool}`);
        }
        break;
        
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    
    res.json({
      jsonrpc: '2.0',
      id,
      result
    });
    
  } catch (error) {
    res.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});

// Mount API routes
app.use('/api', api);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 ADE Server running on port ${PORT}`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   MCP endpoint: http://localhost:${PORT}/api/mcp`);
});

// WebSocket for real-time communication
const wss = new WebSocket.Server({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected. Total clients:', clients.size);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to ADE Server',
    timestamp: new Date().toISOString()
  }));
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Broadcast to all clients
      const response = {
        type: 'broadcast',
        from: message.from || 'anonymous',
        content: message.content,
        timestamp: new Date().toISOString()
      };
      
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(response));
        }
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected. Total clients:', clients.size);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});