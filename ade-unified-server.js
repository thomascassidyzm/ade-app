// ADE Unified Server - Brings together all agent communication components
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

// Import core components
const VFSStorageHandler = require('./vfs-storage-handler');
const APMLMessageBroker = require('./apml-message-broker');
const AgentRegistry = require('./agent-registry');
const APMLMCPBridge = require('./apml-mcp-bridge');
const { router: vfsWriteRouter, initialize: initVFSWrite } = require('./vfs-write-api');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize core components
const vfsHandler = new VFSStorageHandler('./vfs-storage');
const messageBroker = new APMLMessageBroker();
const agentRegistry = new AgentRegistry(messageBroker, vfsHandler);
const mcpBridge = new APMLMCPBridge(agentRegistry, messageBroker, vfsHandler);

// Set VFS handler on message broker
messageBroker.setVFSHandler(vfsHandler);

// Initialize VFS write API
initVFSWrite(vfsHandler, messageBroker);

// Mount VFS write API
app.use('/api/vfs', vfsWriteRouter);

// Agent registration endpoint
app.post('/api/agents/register', async (req, res) => {
  try {
    const { agentId, config } = req.body;
    
    if (!agentId || !config) {
      return res.status(400).json({ error: 'agentId and config required' });
    }
    
    // Note: WebSocket will be provided when agent connects via WS
    const result = await agentRegistry.registerAgent(agentId, config, null);
    
    res.json({
      success: true,
      agentId: result.agentId,
      token: result.token,
      vfsEndpoint: `/api/vfs`,
      wsEndpoint: `ws://localhost:${PORT}`
    });
  } catch (error) {
    console.error('Agent registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get agent info
app.get('/api/agents/:agentId', (req, res) => {
  const agent = agentRegistry.getAgent(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

// List all agents
app.get('/api/agents', (req, res) => {
  res.json({
    agents: agentRegistry.getAllAgents(),
    capabilities: agentRegistry.getAllCapabilities()
  });
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
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
          serverInfo: mcpBridge.getMCPServerConfig()
        };
        break;
        
      case 'tools/list':
        result = { tools: mcpBridge.getMCPTools() };
        break;
        
      case 'tools/call':
        result = await mcpBridge.handleToolCall(
          params.name,
          params.arguments,
          id
        );
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

// Serve static files and resources
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve design system and navigation
app.get('/ade-design-system.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-design-system.css'));
});

app.get('/ade-nav.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-nav.js'));
});

// Serve APML utilities
app.get('/apml-to-live-preview.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-to-live-preview.js'));
});

app.get('/apml-app-visualizer.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-app-visualizer.js'));
});

// Page routes - use existing HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-home.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'l1-orch-interface.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'vfs-enhanced-dashboard.html'));
});

app.get('/visualizer', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-app-flow-visualizer.html'));
});

app.get('/builder', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-builder-interface.html'));
});

app.get('/cost-calculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-cost-calculator.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    components: {
      vfs: 'operational',
      messageBroker: 'operational',
      agentRegistry: `${agentRegistry.getAllAgents().length} agents registered`,
      mcp: 'operational'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  console.log(`ADE Unified Server running on port ${PORT}`);
  
  // Load existing agent registry
  await agentRegistry.loadRegistry();
  
  console.log('Components initialized:');
  console.log('- VFS Storage Handler');
  console.log('- APML Message Broker');
  console.log('- Agent Registry');
  console.log('- MCP Bridge');
});

// WebSocket server for real-time communication
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  console.log(`WebSocket client connected: ${clientId}`);
  
  let agentId = null;
  let isAgent = false;
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'agent_connect':
          // Agent connecting with credentials
          if (!message.agentId || !message.token) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'agentId and token required' 
            }));
            return;
          }
          
          // Validate token
          if (!agentRegistry.validateToken(message.agentId, message.token)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Invalid token' 
            }));
            ws.close();
            return;
          }
          
          // Update agent's websocket
          agentId = message.agentId;
          isAgent = true;
          const agent = agentRegistry.agents.get(agentId);
          if (agent) {
            agent.websocket = ws;
            await agentRegistry.updateAgentStatus(agentId, 'online');
          }
          
          ws.send(JSON.stringify({
            type: 'connected',
            agentId: agentId,
            message: 'Agent connected successfully'
          }));
          
          // Broadcast updated agent list
          broadcastAgentList();
          break;
          
        case 'apml_message':
          // Handle APML messages between agents
          if (!isAgent || !agentId) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Not authenticated as agent' 
            }));
            return;
          }
          
          messageBroker.sendMessage(
            agentId,
            message.to,
            message.messageType,
            message.content
          );
          break;
          
        case 'user_request':
          // User sends request to L1_ORCH
          const l1Agent = agentRegistry.findBestAgent(['orchestration']);
          
          if (l1Agent) {
            messageBroker.sendBrief('user', l1Agent.id, message.request, {
              userId: clientId,
              sessionId: message.sessionId
            });
            
            ws.send(JSON.stringify({
              type: 'request_received',
              message: 'Request sent to orchestration agent'
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'No orchestration agent available'
            }));
          }
          break;
          
        case 'heartbeat':
          // Agent heartbeat
          if (isAgent && agentId) {
            await agentRegistry.heartbeat(agentId);
            ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
          }
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
  
  ws.on('close', async () => {
    if (isAgent && agentId) {
      await agentRegistry.updateAgentStatus(agentId, 'offline');
      broadcastAgentList();
    }
    console.log(`Client disconnected: ${clientId}`);
  });
});

// Broadcast agent list to all connected clients
function broadcastAgentList() {
  const agents = agentRegistry.getAllAgents();
  const message = JSON.stringify({
    type: 'agent_list',
    agents: agents
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Listen for agent responses to route back through MCP
messageBroker.on('agent_response', async (data) => {
  if (data.report && data.report.context && data.report.context.mcpRequestId) {
    await mcpBridge.handleAgentResponse(data.agentId, data.report);
  }
});

// VFS update broadcasting
vfsHandler.on('vfs_update', (update) => {
  const message = JSON.stringify({
    type: 'vfs_update',
    ...update
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

console.log('ADE Unified Server ready!');
console.log('- HTTP API: http://localhost:' + PORT);
console.log('- WebSocket: ws://localhost:' + PORT);
console.log('- MCP Endpoint: http://localhost:' + PORT + '/mcp');