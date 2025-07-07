const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const path = require('path');
const DeploymentWebSocketHandler = require('./deployment-websocket-handler');
const VFSStorageHandler = require('./vfs-storage-handler');

const app = express();
app.use(cors());
app.use(express.json());
// Don't serve static files from root - we handle routes explicitly

// Health check for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve shared files
app.get('/ade-design-system.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-design-system.css'));
});

// shared-nav-styles.css removed - styles are in ade-nav.js

// nav-component.js removed - using ade-nav.js

app.get('/apml-to-live-preview.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-to-live-preview.js'));
});

app.get('/apml-app-visualizer.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-app-visualizer.js'));
});

// Serve navigation component
app.get('/ade-nav.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-nav.js'));
});

// Serve the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-home.html'));
});

// Serve the L1_ORCH chat interface
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'l1-orch-interface.html'));
});

// Serve other interfaces
app.get('/visualizer', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-app-flow-visualizer.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'vfs-enhanced-dashboard.html'));
});

// Serve the ADE Builder interface
app.get('/builder', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-builder-interface.html'));
});

// Serve the Cost Calculator
app.get('/cost-calculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-cost-calculator.html'));
});

// MCP endpoint for Claude Desktop
app.post('/mcp', express.json(), async (req, res) => {
  // Check API key in production
  if (process.env.NODE_ENV === 'production' || process.env.MCP_API_KEY) {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (apiKey !== process.env.MCP_API_KEY) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or missing API key'
      });
    }
  }
  
  try {
    const { method, params, id, jsonrpc } = req.body;
    
    // Basic MCP protocol handling
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
                  query: { type: 'string' }
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
                  description: { type: 'string' }
                },
                required: ['description']
              }
            }
          ]
        };
        break;
        
      case 'tools/call':
        // Simple mock responses for now
        if (params.name === 'search_apml_patterns') {
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify([
                { id: 'auth-basic', name: 'Basic Authentication', category: 'auth' },
                { id: 'dashboard-layout', name: 'Dashboard Layout', category: 'layout' }
              ], null, 2)
            }]
          };
        } else if (params.name === 'create_app_spec') {
          result = {
            content: [{
              type: 'text',
              text: 'App specification created for: ' + params.arguments.description
            }]
          };
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

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
  console.log(`MCP endpoint available at http://localhost:${process.env.PORT || 3000}/mcp`);
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Initialize deployment handler
const deploymentHandler = new DeploymentWebSocketHandler(wss);

// Initialize VFS storage handler
const vfsHandler = new VFSStorageHandler('./vfs-storage');

// Connected clients
const clients = new Map();
const agents = new Map();

// Listen for VFS updates to broadcast
vfsHandler.on('vfs_update', (update) => {
  broadcast({
    type: 'vfs_update',
    ...update
  });
});

vfsHandler.on('vfs_error', (error) => {
  broadcast({
    type: 'vfs_error',
    ...error
  });
});

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  console.log(`New WebSocket connection: ${clientId}`);
  
  clients.set(clientId, {
    ws,
    type: null,
    agentId: null
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    clientId,
    message: 'Connected to ADE WebSocket Hub'
  }));
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      // Try deployment handler first
      const handled = await deploymentHandler.handleMessage(ws, data);
      
      if (!handled) {
        // Fall back to regular message handling
        handleMessage(clientId, message);
      }
    } catch (error) {
      console.error('Invalid message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
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
    console.log(`Client disconnected: ${clientId}`);
  });
});

function handleMessage(clientId, message) {
  const client = clients.get(clientId);
  
  switch (message.type) {
    case 'register_agent':
      // protoADE registers here
      client.type = 'agent';
      client.agentId = message.agentId;
      client.capabilities = message.capabilities;
      agents.set(message.agentId, client);
      
      client.ws.send(JSON.stringify({
        type: 'registered',
        agentId: message.agentId,
        status: 'success'
      }));
      
      broadcastAgentList();
      console.log(`Agent registered: ${message.agentId}`);
      break;
      
    case 'user_request':
      // User sends request from chat interface
      client.type = 'user';
      
      // Find L1_ORCH agent (protoADE)
      const l1Orch = Array.from(agents.values()).find(
        agent => agent.agentId === 'protoADE' || agent.capabilities?.includes('orchestration')
      );
      
      if (l1Orch) {
        // Forward to protoADE
        l1Orch.ws.send(JSON.stringify({
          type: 'user_request',
          userId: clientId,
          request: message.request,
          sessionId: message.sessionId || clientId
        }));
      } else {
        client.ws.send(JSON.stringify({
          type: 'error',
          message: 'No orchestration agent available'
        }));
      }
      break;
      
    case 'agent_response':
      // protoADE sends response back to user
      const userClient = clients.get(message.userId);
      if (userClient) {
        userClient.ws.send(JSON.stringify({
          type: 'agent_response',
          ...message
        }));
      }
      break;
      
    case 'agent_progress':
      // Real-time progress updates
      const targetClient = clients.get(message.userId);
      if (targetClient) {
        targetClient.ws.send(JSON.stringify({
          type: 'progress',
          ...message
        }));
      }
      break;
      
    case 'vfs_operation':
      // Virtual file system operations
      handleVFSOperation(clientId, message.operation);
      break;
  }
}

function broadcastAgentList() {
  const agentList = Array.from(agents.entries()).map(([id, agent]) => ({
    agentId: id,
    capabilities: agent.capabilities,
    status: 'online'
  }));
  
  broadcast({
    type: 'agent_list',
    agents: agentList
  });
}

function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function broadcastToAgents(message) {
  const data = JSON.stringify(message);
  agents.forEach(agent => {
    if (agent.ws.readyState === WebSocket.OPEN) {
      agent.ws.send(data);
    }
  });
}

async function handleVFSOperation(clientId, operation) {
  try {
    const result = await vfsHandler.handleVFSOperation(operation);
    
    // Send success response to client
    const client = clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({
        type: 'vfs_response',
        requestId: operation.requestId,
        result,
        success: true
      }));
    }
  } catch (error) {
    // Send error response to client
    const client = clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({
        type: 'vfs_response',
        requestId: operation.requestId,
        error: error.message,
        success: false
      }));
    }
  }
}

// Import existing API routes - commented out for now due to ES module conflicts
// TODO: Convert API routes to CommonJS or use dynamic imports
// const vfsRouter = require('./api/vfs');
// const messagesRouter = require('./api/messages');
// const agentsRouter = require('./api/agents');

// app.use('/api/vfs', vfsRouter);
// app.use('/api/messages', messagesRouter);
// app.use('/api/agents', agentsRouter);

console.log('ADE WebSocket Hub ready for Railway deployment!');
console.log('WebSocket endpoint: ws://localhost:3000 (wss:// in production)');