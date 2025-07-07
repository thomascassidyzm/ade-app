#!/usr/bin/env node
/**
 * Local MCP Server for ADE
 * A more robust approach that won't crash Claude Desktop
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require('axios');

const ADE_URL = process.env.ADE_SERVER_URL || 'https://ade-app.up.railway.app';

class ADEMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'ade-apml',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupErrorHandling();
  }

  setupTools() {
    // Send APML message
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'send_apml',
            description: 'Send APML message to ADE agents',
            inputSchema: {
              type: 'object',
              properties: {
                to: { 
                  type: 'string',
                  description: 'Target agent ID or "all" for broadcast'
                },
                type: { 
                  type: 'string',
                  description: 'APML message type (brief, status, handoff)'
                },
                content: { 
                  type: 'object',
                  description: 'Message content'
                }
              },
              required: ['to', 'type', 'content']
            }
          },
          {
            name: 'create_agent',
            description: 'Register a new ADE agent',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                capabilities: { 
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['id', 'name', 'capabilities']
            }
          },
          {
            name: 'list_agents',
            description: 'Get list of registered agents',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'write_apml_file',
            description: 'Write APML content to VFS',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                content: { type: 'object' }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'read_apml_file',
            description: 'Read APML file from VFS',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' }
              },
              required: ['path']
            }
          },
          {
            name: 'build_app',
            description: 'High-level command to build an application',
            inputSchema: {
              type: 'object',
              properties: {
                description: { 
                  type: 'string',
                  description: 'Natural language description of the app to build'
                },
                type: {
                  type: 'string',
                  enum: ['web', 'mobile', 'api'],
                  description: 'Type of application'
                }
              },
              required: ['description']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'send_apml':
            return await this.sendAPML(args);
          
          case 'create_agent':
            return await this.createAgent(args);
          
          case 'list_agents':
            return await this.listAgents();
          
          case 'write_apml_file':
            return await this.writeAPMLFile(args);
          
          case 'read_apml_file':
            return await this.readAPMLFile(args);
          
          case 'build_app':
            return await this.buildApp(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }]
        };
      }
    });
  }

  async sendAPML(args) {
    // Call the MCP endpoint which will convert to APML internally
    const response = await this.callADE('tools/call', {
      name: 'send_apml',
      arguments: args
    });

    return {
      content: [{
        type: 'text',
        text: `APML message sent to ${args.to}:\n${JSON.stringify(args.content, null, 2)}`
      }]
    };
  }

  async createAgent(args) {
    // Register via APML API
    const response = await axios.post(
      `${ADE_URL}/api/agents/register`,
      `---
apml: 1.0
type: agent_registration
---
id: ${args.id}
name: ${args.name}
capabilities:
${args.capabilities.map(c => '  - ' + c).join('\n')}`,
      {
        headers: { 'Content-Type': 'application/apml' }
      }
    );

    return {
      content: [{
        type: 'text',
        text: `Agent created: ${args.id} with capabilities: ${args.capabilities.join(', ')}`
      }]
    };
  }

  async listAgents() {
    const response = await axios.get(`${ADE_URL}/api/agents`, {
      headers: { 'Accept': 'application/apml' }
    });

    return {
      content: [{
        type: 'text',
        text: response.data
      }]
    };
  }

  async writeAPMLFile(args) {
    const response = await this.callADE('tools/call', {
      name: 'write_apml_file',
      arguments: args
    });

    return {
      content: [{
        type: 'text',
        text: `APML file written to: ${args.path}`
      }]
    };
  }

  async readAPMLFile(args) {
    const response = await axios.get(
      `${ADE_URL}/api/vfs/read/${encodeURIComponent(args.path)}`,
      {
        headers: { 'Accept': 'application/apml' }
      }
    );

    return {
      content: [{
        type: 'text',
        text: response.data
      }]
    };
  }

  async buildApp(args) {
    // This is the high-level orchestration
    const brief = {
      apml: '1.0',
      type: 'brief',
      from: 'claude-desktop',
      to: 'l1-orch',
      task: {
        type: 'build_application',
        description: args.description,
        appType: args.type || 'web'
      }
    };

    await this.sendAPML({
      to: 'all',
      type: 'brief',
      content: brief
    });

    return {
      content: [{
        type: 'text',
        text: `Started building: ${args.description}\n\nAgents are now working on your application. Check the ADE dashboard for progress.`
      }]
    };
  }

  async callADE(method, params) {
    const response = await axios.post(`${ADE_URL}/api/mcp`, {
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.result;
  }

  setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ADE MCP Server running');
  }
}

// Run the server
const server = new ADEMCPServer();
server.run().catch(console.error);