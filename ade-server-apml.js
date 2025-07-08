/**
 * ADE Server - APML Native Version
 * All internal communications use APML, not JSON
 */

const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;
const APMLParser = require('./apml-parser');
const APMLGuidanceSystem = require('./apml-guidance-system');
const APMLLibrarySystem = require('./apml-library-system');
const APMLCapabilityLibrary = require('./apml-capability-library');

const app = express();

// Middleware to parse APML bodies
app.use(express.text({ type: 'application/apml' }));
app.use(express.json()); // Still need JSON for MCP compatibility

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Main app - serve the start page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-start.html'));
});

// Phase-specific routes
app.get('/visualizer', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-interface-v2.html'));
});

app.get('/start', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-start.html'));
});

// Legacy interface
app.get('/old', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-apml.html'));
});

// API Routes
const api = express.Router();

// Parse APML requests
api.use((req, res, next) => {
  if (req.headers['content-type'] === 'application/apml' && typeof req.body === 'string') {
    try {
      req.body = APMLParser.parse(req.body);
      req.isAPML = true;
    } catch (error) {
      return res.status(400).send(APMLParser.stringify({
        apml: '1.0',
        type: 'error',
        error: 'Invalid APML format',
        message: error.message
      }));
    }
  }
  next();
});

// Health check - returns APML
api.get('/health', (req, res) => {
  const health = {
    apml: '1.0',
    type: 'health_status',
    timestamp: new Date().toISOString(),
    server: 'ade-server-apml',
    version: '2.0.0',
    status: 'healthy'
  };
  
  res.type('application/apml');
  res.send(APMLParser.stringify(health));
});

// VFS API endpoints
api.get('/vfs', (req, res) => {
  const files = Array.from(vfs.entries()).map(([path, data]) => ({
    path,
    size: data.content ? data.content.length : 0,
    modified: data.timestamp,
    from: data.from
  }));
  
  res.type('application/apml');
  res.send(APMLParser.stringify({
    apml: '1.0',
    type: 'vfs_listing',
    files: files,
    count: files.length,
    timestamp: new Date().toISOString()
  }));
});

api.get('/vfs/*', (req, res) => {
  const path = req.params[0];
  const file = vfs.get(path) || vfs.get('/' + path);
  
  if (!file) {
    res.status(404).type('application/apml');
    res.send(APMLParser.stringify({
      apml: '1.0',
      type: 'error',
      error: 'File not found',
      path: path
    }));
    return;
  }
  
  res.type('application/apml');
  res.send(APMLParser.stringify({
    apml: '1.0',
    type: 'vfs_file',
    path: path,
    content: file.content,
    metadata: file.metadata,
    timestamp: file.timestamp
  }));
});

// Agent management
const agents = new Map();

api.post('/agents/register', (req, res) => {
  const data = req.body;
  
  if (!data.id || !data.name || !data.capabilities) {
    res.type('application/apml');
    return res.status(400).send(APMLParser.stringify({
      apml: '1.0',
      type: 'error',
      error: 'Missing required fields',
      required: ['id', 'name', 'capabilities']
    }));
  }
  
  const agent = {
    id: data.id,
    name: data.name,
    capabilities: data.capabilities,
    status: 'online',
    registeredAt: new Date().toISOString()
  };
  
  agents.set(data.id, agent);
  
  res.type('application/apml');
  res.send(APMLParser.stringify({
    apml: '1.0',
    type: 'agent_registered',
    id: agent.id,
    success: true,
    agent: agent
  }));
});

api.get('/agents', (req, res) => {
  const agentList = {
    apml: '1.0',
    type: 'agent_list',
    timestamp: new Date().toISOString(),
    count: agents.size,
    agents: Array.from(agents.values())
  };
  
  res.type('application/apml');
  res.send(APMLParser.stringify(agentList));
});

// APML Library API
api.get('/library', (req, res) => {
  const catalog = {
    apml: '1.0',
    type: 'library_catalog',
    timestamp: new Date().toISOString(),
    version: librarySystem.libraryVersion,
    categories: Object.keys(librarySystem.components).map(cat => ({
      name: cat,
      count: Object.keys(librarySystem.components[cat]).length
    })),
    templates: Object.keys(librarySystem.templates),
    total_components: librarySystem.countComponents()
  };
  
  res.type('application/apml');
  res.send(APMLParser.stringify(catalog));
});

api.get('/library/:category', (req, res) => {
  const category = req.params.category;
  const components = librarySystem.getCategory(category);
  
  if (!components) {
    return res.status(404).type('application/apml').send(APMLParser.stringify({
      apml: '1.0',
      type: 'error',
      error: 'Category not found'
    }));
  }
  
  res.type('application/apml');
  res.send(APMLParser.stringify({
    apml: '1.0',
    type: 'category_components',
    category: category,
    components: Object.keys(components).map(name => ({
      name,
      path: `${category}/${name}`,
      description: components[name].description
    }))
  }));
});

api.get('/library/:category/:component', (req, res) => {
  const path = `${req.params.category}/${req.params.component}`;
  const component = librarySystem.getComponent(path);
  
  if (!component) {
    return res.status(404).type('application/apml').send(APMLParser.stringify({
      apml: '1.0',
      type: 'error',
      error: 'Component not found'
    }));
  }
  
  res.type('application/apml');
  res.send(APMLParser.stringify({
    apml: '1.0',
    type: 'component_detail',
    path: path,
    component: component
  }));
});

// VFS - APML native
const vfs = new Map();

// Initialize APML Systems
const guidanceSystem = new APMLGuidanceSystem();
const librarySystem = new APMLLibrarySystem();
const capabilityLibrary = new APMLCapabilityLibrary();

api.post('/vfs/write', (req, res) => {
  const data = req.body;
  
  if (!data.path || !data.content) {
    res.type('application/apml');
    return res.status(400).send(APMLParser.stringify({
      apml: '1.0',
      type: 'error',
      error: 'Path and content required'
    }));
  }
  
  vfs.set(data.path, {
    content: data.content,
    metadata: data.metadata || {},
    updatedAt: new Date().toISOString()
  });
  
  res.type('application/apml');
  res.send(APMLParser.stringify({
    apml: '1.0',
    type: 'file_written',
    path: data.path,
    success: true,
    timestamp: new Date().toISOString()
  }));
});

api.get('/vfs/read/:path(*)', (req, res) => {
  const file = vfs.get(req.params.path);
  
  if (!file) {
    res.type('application/apml');
    return res.status(404).send(APMLParser.stringify({
      apml: '1.0',
      type: 'error',
      error: 'File not found',
      path: req.params.path
    }));
  }
  
  res.type('application/apml');
  res.send(APMLParser.stringify({
    apml: '1.0',
    type: 'file_content',
    path: req.params.path,
    content: file.content,
    metadata: file.metadata,
    updatedAt: file.updatedAt
  }));
});

api.get('/vfs/list', (req, res) => {
  res.type('application/apml');
  res.send(APMLParser.stringify({
    apml: '1.0',
    type: 'file_list',
    timestamp: new Date().toISOString(),
    count: vfs.size,
    files: Array.from(vfs.keys())
  }));
});

// MCP endpoint - translates between JSON and APML
api.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;
  
  try {
    let result;
    
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'ade-server-apml',
            version: '2.0.0',
            description: 'APML-native ADE server'
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
              name: 'send_apml',
              description: 'Send APML message to agents',
              inputSchema: {
                type: 'object',
                properties: {
                  to: { type: 'string' },
                  type: { type: 'string' },
                  content: { type: 'object' }
                },
                required: ['to', 'type', 'content']
              }
            },
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
              name: 'write_apml_file',
              description: 'Write APML content to VFS',
              inputSchema: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  content: { type: 'object' },
                  metadata: { type: 'object' }
                },
                required: ['path', 'content']
              }
            }
          ]
        };
        break;
        
      case 'tools/call':
        const tool = params.name;
        const args = params.arguments;
        
        if (tool === 'send_apml') {
          // Convert to APML and broadcast
          const apmlMessage = {
            apml: '1.0',
            type: args.type,
            from: 'mcp',
            to: args.to,
            timestamp: new Date().toISOString(),
            content: args.content
          };
          
          // Broadcast via WebSocket
          broadcast(apmlMessage);
          
          result = {
            content: [{
              type: 'text',
              text: `APML message sent to ${args.to}`
            }]
          };
        } else if (tool === 'create_agent') {
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
        } else if (tool === 'write_apml_file') {
          const apmlContent = APMLParser.stringify(args.content);
          vfs.set(args.path, {
            content: apmlContent,
            metadata: args.metadata || {},
            updatedAt: new Date().toISOString()
          });
          
          result = {
            content: [{
              type: 'text',
              text: `APML file written to ${args.path}`
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
  console.log(`🚀 ADE Server (APML Native) running on port ${PORT}`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   MCP endpoint: http://localhost:${PORT}/api/mcp`);
  console.log(`   All internal APIs use APML format`);
});

// WebSocket for real-time APML communication
const wss = new WebSocket.Server({ server });
const clients = new Set();

// Handle VFS operations
function handleVFSOperation(message) {
  const content = message.content || {};
  const path = content.path;
  const fileContent = content.content || content.fileContent;
  
  if (!path) return;
  
  // Store in VFS
  vfs.set(path, {
    content: fileContent,
    metadata: content.metadata || {},
    from: message.from,
    timestamp: new Date().toISOString()
  });
  
  // Broadcast VFS update to all clients
  broadcast({
    apml: '1.0',
    type: 'vfs_update',
    operation: 'write',
    path: path,
    content: fileContent,
    metadata: content.metadata,
    from: 'VFS',
    timestamp: new Date().toISOString()
  });
  
  console.log(`VFS: Wrote file ${path} from ${message.from}`);
}

function broadcast(apmlMessage) {
  const apmlString = APMLParser.stringify(apmlMessage);
  
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(apmlString);
    }
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected. Total clients:', clients.size);
  
  // Send welcome message in APML
  const welcome = {
    apml: '1.0',
    type: 'welcome',
    from: 'server',
    message: 'Connected to ADE Server (APML Native)',
    timestamp: new Date().toISOString()
  };
  
  ws.send(APMLParser.stringify(welcome));
  
  ws.on('message', (data) => {
    try {
      // Parse incoming APML
      const message = APMLParser.parse(data.toString());
      
      // Add server metadata
      message.from = message.from || 'anonymous';
      message.timestamp = message.timestamp || new Date().toISOString();
      
      // Handle agent connections
      if (message.type === 'agent_connect' && message.agentId === 'L1_ORCH') {
        console.log('L1_ORCH connected, sending APML guidance and library...');
        
        // Send guidance package to L1_ORCH
        const guidance = guidanceSystem.formatAsAPMLMessage();
        ws.send(APMLParser.stringify(guidance));
        
        // Send complete APML library
        const library = librarySystem.formatAsAPMLMessage();
        ws.send(APMLParser.stringify(library));
        
        // Send capability library for sophisticated features
        const capabilities = {
          apml: '1.0',
          type: 'capability_library',
          from: 'ADE_SYSTEM',
          to: 'L1_ORCH',
          timestamp: new Date().toISOString(),
          content: {
            version: capabilityLibrary.version,
            message: "🚀 Advanced Capability Library loaded! Build original apps with sophisticated features.",
            categories: Object.keys(capabilityLibrary.capabilities),
            capabilities: capabilityLibrary.capabilities,
            methods: {
              suggestCapabilities: "Get capability suggestions for innovative apps",
              calculateTimeSaved: "Show development time saved"
            }
          }
        };
        ws.send(APMLParser.stringify(capabilities));
        
        // Also send phase-specific guidance
        const phaseGuidance = {
          apml: '1.0',
          type: 'phase_guidance',
          from: 'ADE_SYSTEM',
          to: 'L1_ORCH',
          content: {
            current_phase: 'specification',
            guidance: guidanceSystem.getPhaseGuidance('specification'),
            library_available: true,
            component_count: librarySystem.countComponents(),
            library_methods: {
              getSuggestionsForApp: "Get AI-powered component suggestions based on description",
              buildFromTemplate: "Build complete spec from template + customizations",
              estimateBuildTime: "Calculate realistic build time for selected components",
              searchComponents: "Search library by keyword"
            },
            message: "Welcome L1_ORCH! You now have access to:\n• APML patterns and conversation helpers\n• Basic component library with " + librarySystem.countComponents() + " UI components\n• ADVANCED CAPABILITY LIBRARY with sophisticated integrations\n• Voice, AI, Payments, Real-time, Video capabilities\n• Each capability saves WEEKS of development\n\nFocus on helping users build ORIGINAL apps with sophisticated features, not template-based apps!"
          },
          timestamp: new Date().toISOString()
        };
        ws.send(APMLParser.stringify(phaseGuidance));
      }
      
      // Handle VFS operations
      if (message.type === 'vfs_write' || message.type === 'apml_message' && message.messageType === 'vfs_write') {
        handleVFSOperation(message);
      }
      
      // Broadcast to all clients
      broadcast(message);
      
    } catch (error) {
      // Send error in APML
      ws.send(APMLParser.stringify({
        apml: '1.0',
        type: 'error',
        error: 'Invalid APML message',
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