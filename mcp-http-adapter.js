// MCP HTTP Adapter for WebApp
// Allows Claude Desktop to connect to webapp via HTTP

const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');

class MCPHTTPAdapter {
  constructor(mcpServer, app) {
    this.mcpServer = mcpServer;
    this.app = app;
    this.setupRoutes();
  }

  setupRoutes() {
    // MCP endpoint that Claude Desktop will connect to
    this.app.post('/mcp', express.json(), async (req, res) => {
      try {
        const { method, params } = req.body;
        
        // Route MCP requests
        let result;
        switch (method) {
          case 'initialize':
            result = {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {},
                logging: {}
              },
              serverInfo: {
                name: 'ade-webapp',
                version: '1.0.0'
              }
            };
            break;
            
          case 'tools/list':
            result = await this.handleToolsList();
            break;
            
          case 'tools/call':
            result = await this.handleToolCall(params);
            break;
            
          case 'resources/list':
            result = await this.handleResourcesList();
            break;
            
          case 'resources/read':
            result = await this.handleResourceRead(params);
            break;
            
          default:
            throw new Error(`Unknown method: ${method}`);
        }
        
        res.json({ result });
      } catch (error) {
        res.status(400).json({ 
          error: {
            code: -32603,
            message: error.message
          }
        });
      }
    });
    
    // Health check endpoint
    this.app.get('/mcp/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        serverType: 'ade-webapp-mcp',
        tools: this.getToolCount()
      });
    });
  }

  async handleToolsList() {
    return {
      tools: [
        {
          name: 'create_app',
          description: 'Create a new app using APML patterns',
          inputSchema: {
            type: 'object',
            properties: {
              description: { 
                type: 'string', 
                description: 'Natural language description of the app'
              },
              patterns: {
                type: 'array',
                items: { type: 'string' },
                description: 'APML patterns to use'
              }
            },
            required: ['description']
          }
        },
        {
          name: 'get_apml_pattern',
          description: 'Get an APML pattern from the library',
          inputSchema: {
            type: 'object',
            properties: {
              patternId: { 
                type: 'string',
                description: 'ID of the pattern to retrieve'
              }
            },
            required: ['patternId']
          }
        },
        {
          name: 'search_patterns',
          description: 'Search for APML patterns',
          inputSchema: {
            type: 'object',
            properties: {
              query: { 
                type: 'string',
                description: 'Search query'
              },
              category: {
                type: 'string',
                description: 'Filter by category (optional)'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'visualize_app',
          description: 'Generate visualization of app structure',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              format: { 
                type: 'string',
                enum: ['flow', 'hierarchy', 'components'],
                default: 'flow'
              }
            },
            required: ['sessionId']
          }
        },
        {
          name: 'generate_code',
          description: 'Generate code from APML specification',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              platform: {
                type: 'string',
                enum: ['react', 'vue', 'react-native', 'flutter'],
                default: 'react'
              }
            },
            required: ['sessionId']
          }
        },
        {
          name: 'vfs_write',
          description: 'Write file to virtual file system',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['path', 'content']
          }
        },
        {
          name: 'vfs_read',
          description: 'Read file from virtual file system',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' }
            },
            required: ['path']
          }
        }
      ]
    };
  }

  async handleToolCall(params) {
    const { name, arguments: args } = params;
    
    // Delegate to the main MCP server
    const handler = this.mcpServer._requestHandlers.get('tools/call');
    if (handler) {
      return await handler({ params });
    }
    
    throw new Error(`Tool not found: ${name}`);
  }

  async handleResourcesList() {
    const handler = this.mcpServer._requestHandlers.get('resources/list');
    if (handler) {
      return await handler({});
    }
    return { resources: [] };
  }

  async handleResourceRead(params) {
    const handler = this.mcpServer._requestHandlers.get('resources/read');
    if (handler) {
      return await handler({ params });
    }
    throw new Error('Resource not found');
  }

  getToolCount() {
    return 7; // Number of tools we provide
  }
}

module.exports = MCPHTTPAdapter;