// MCP WebApp Server
// The webapp IS the MCP server - unified architecture for production

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const VFSStorageHandler = require('./vfs-storage-handler');
const APMLProtocol = require('./apml-protocol');

class MCPWebAppServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.mcpServer = new Server({
      name: 'ade-mcp-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });
    
    // Core services
    this.vfsHandler = new VFSStorageHandler('./vfs-storage');
    this.apmlProtocol = new APMLProtocol();
    this.apmlLibrary = new Map(); // APML standard library
    this.agents = new Map();
    this.sessions = new Map();
    
    this.setupExpress();
    this.setupMCPTools();
    this.setupWebSocket();
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));

    // Serve static files
    this.app.get('/ade-design-system.css', (req, res) => {
      res.sendFile(path.join(__dirname, 'ade-design-system.css'));
    });

    this.app.get('/apml-protocol.js', (req, res) => {
      res.sendFile(path.join(__dirname, 'apml-protocol.js'));
    });

    // Serve SPA
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index-spa.html'));
    });

    // API endpoints for APML library
    this.app.get('/api/apml/patterns', (req, res) => {
      const patterns = Array.from(this.apmlLibrary.entries()).map(([key, value]) => ({
        id: key,
        name: value.name,
        category: value.category,
        description: value.description
      }));
      res.json(patterns);
    });

    this.app.get('/api/apml/pattern/:id', (req, res) => {
      const pattern = this.apmlLibrary.get(req.params.id);
      if (pattern) {
        res.json(pattern);
      } else {
        res.status(404).json({ error: 'Pattern not found' });
      }
    });

    this.app.post('/api/apml/pattern', (req, res) => {
      const { id, pattern } = req.body;
      this.apmlLibrary.set(id, pattern);
      res.json({ success: true, id });
    });

    // Session management
    this.app.post('/api/session/create', (req, res) => {
      const sessionId = Math.random().toString(36).substring(7);
      this.sessions.set(sessionId, {
        id: sessionId,
        created: new Date(),
        messages: [],
        apmlSpec: {},
        status: 'active'
      });
      res.json({ sessionId });
    });
  }

  setupMCPTools() {
    // Tool: Get APML Pattern
    this.mcpServer.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'get_apml_pattern':
          const pattern = this.apmlLibrary.get(args.patternId);
          return {
            content: [{
              type: 'text',
              text: pattern ? JSON.stringify(pattern, null, 2) : 'Pattern not found'
            }]
          };

        case 'search_apml_patterns':
          const results = Array.from(this.apmlLibrary.entries())
            .filter(([key, value]) => 
              value.name.toLowerCase().includes(args.query.toLowerCase()) ||
              value.description.toLowerCase().includes(args.query.toLowerCase())
            )
            .map(([key, value]) => ({ id: key, ...value }));
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }]
          };

        case 'create_app_spec':
          const session = this.sessions.get(args.sessionId);
          if (session) {
            session.apmlSpec = args.spec;
            return {
              content: [{
                type: 'text',
                text: 'App specification created successfully'
              }]
            };
          }
          return {
            content: [{
              type: 'text',
              text: 'Session not found'
            }]
          };

        case 'vfs_write':
          await this.vfsHandler.handleVFSOperation({
            type: 'write',
            path: args.path,
            content: args.content
          });
          return {
            content: [{
              type: 'text',
              text: `File written: ${args.path}`
            }]
          };

        case 'vfs_read':
          const content = await this.vfsHandler.handleVFSOperation({
            type: 'read',
            path: args.path
          });
          return {
            content: [{
              type: 'text',
              text: content
            }]
          };

        case 'generate_code':
          // Generate code from APML spec
          const codeGen = await this.generateCode(args.spec, args.platform);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(codeGen, null, 2)
            }]
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // List available tools
    this.mcpServer.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'get_apml_pattern',
            description: 'Get an APML pattern from the standard library',
            inputSchema: {
              type: 'object',
              properties: {
                patternId: { type: 'string', description: 'Pattern ID' }
              },
              required: ['patternId']
            }
          },
          {
            name: 'search_apml_patterns',
            description: 'Search APML patterns in the library',
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
            description: 'Create an app specification from APML',
            inputSchema: {
              type: 'object',
              properties: {
                sessionId: { type: 'string', description: 'Session ID' },
                spec: { type: 'object', description: 'APML specification' }
              },
              required: ['sessionId', 'spec']
            }
          },
          {
            name: 'vfs_write',
            description: 'Write a file to the virtual file system',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path' },
                content: { type: 'string', description: 'File content' }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'vfs_read',
            description: 'Read a file from the virtual file system',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path' }
              },
              required: ['path']
            }
          },
          {
            name: 'generate_code',
            description: 'Generate code from APML specification',
            inputSchema: {
              type: 'object',
              properties: {
                spec: { type: 'object', description: 'APML specification' },
                platform: { type: 'string', description: 'Target platform (react, vue, etc)' }
              },
              required: ['spec', 'platform']
            }
          }
        ]
      };
    });

    // Resources (APML patterns as resources)
    this.mcpServer.setRequestHandler('resources/list', async () => {
      const resources = Array.from(this.apmlLibrary.entries()).map(([key, value]) => ({
        uri: `apml://patterns/${key}`,
        name: value.name,
        description: value.description,
        mimeType: 'application/x-apml+json'
      }));

      return { resources };
    });

    this.mcpServer.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;
      const match = uri.match(/^apml:\/\/patterns\/(.+)$/);
      
      if (match) {
        const pattern = this.apmlLibrary.get(match[1]);
        if (pattern) {
          return {
            contents: [{
              uri,
              mimeType: 'application/x-apml+json',
              text: JSON.stringify(pattern, null, 2)
            }]
          };
        }
      }
      
      throw new Error(`Resource not found: ${uri}`);
    });
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ noServer: true });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = Math.random().toString(36).substring(7);
      console.log(`WebSocket connection: ${clientId}`);
      
      // Handle both APML and JSON messages
      ws.on('message', async (data) => {
        try {
          let message;
          try {
            message = JSON.parse(data);
          } catch {
            // Try parsing as APML
            message = this.apmlProtocol.parseAPML(data.toString());
          }
          
          await this.handleWebSocketMessage(ws, clientId, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            error: error.message
          }));
        }
      });
      
      ws.on('close', () => {
        console.log(`WebSocket disconnected: ${clientId}`);
      });
    });
  }

  async handleWebSocketMessage(ws, clientId, message) {
    switch (message.type) {
      case 'register':
      case 'register_agent':
        this.agents.set(message.agentId || message.agent?.id, {
          id: message.agentId || message.agent?.id,
          ws,
          capabilities: message.capabilities || message.agent?.capabilities
        });
        ws.send(JSON.stringify({
          type: 'registered',
          status: 'success'
        }));
        break;
        
      case 'request':
      case 'user_request':
        // Route to Claude API agent
        const response = await this.processUserRequest(message);
        ws.send(JSON.stringify(response));
        break;
        
      case 'vfs_operation':
        const result = await this.vfsHandler.handleVFSOperation(message.operation);
        ws.send(JSON.stringify({
          type: 'vfs_response',
          result
        }));
        break;
    }
  }

  async processUserRequest(message) {
    // In production, this would call Claude API
    // For now, return a mock response
    return {
      type: 'response',
      content: 'Processing your request...',
      sessionId: message.sessionId
    };
  }

  async generateCode(spec, platform = 'react') {
    // Mock code generation - in production this would use the full code generator
    return {
      platform,
      files: [
        {
          path: 'src/App.js',
          content: '// Generated app code from APML spec'
        }
      ]
    };
  }

  loadAPMLLibrary() {
    // Load standard APML patterns
    this.apmlLibrary.set('basic-auth', {
      name: 'Basic Authentication',
      category: 'auth',
      description: 'Standard login/logout flow',
      specification: {
        screens: ['LoginScreen', 'SignupScreen'],
        components: ['AuthForm', 'PasswordInput'],
        navigation: {
          'LoginScreen': { success: 'HomeScreen', signup: 'SignupScreen' },
          'SignupScreen': { success: 'HomeScreen', login: 'LoginScreen' }
        }
      }
    });

    this.apmlLibrary.set('dashboard-layout', {
      name: 'Dashboard Layout',
      category: 'layout',
      description: 'Standard dashboard with sidebar navigation',
      specification: {
        screens: ['DashboardScreen'],
        components: ['Sidebar', 'Header', 'ContentArea'],
        layout: 'horizontal-split'
      }
    });

    console.log('APML Standard Library loaded with', this.apmlLibrary.size, 'patterns');
  }

  async start() {
    this.loadAPMLLibrary();
    
    this.server = this.app.listen(this.port, () => {
      console.log(`MCP WebApp Server running on port ${this.port}`);
      console.log(`Web interface: http://localhost:${this.port}`);
      console.log(`MCP endpoint: http://localhost:${this.port}/mcp`);
    });

    // Handle WebSocket upgrade
    this.server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    // Start MCP server transport
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    console.log('MCP server transport connected');
  }
}

// Export for use as library or standalone
module.exports = MCPWebAppServer;

// Run if called directly
if (require.main === module) {
  const server = new MCPWebAppServer(process.env.PORT || 3000);
  server.start().catch(console.error);
}