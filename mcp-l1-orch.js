#!/usr/bin/env node
/**
 * MCP L1_ORCH Server - Claude Desktop acts as the orchestrator
 * Connects via WebSocket to receive briefs from web UI
 */

const readline = require('readline');
const WebSocket = require('ws');
const http = require('http');

// Configuration
const ADE_WS_URL = process.env.ADE_WS_URL || 'ws://localhost:3000';
const ADE_HTTP_URL = process.env.ADE_HTTP_URL || 'http://localhost:3000';

// Global state
let ws = null;
let isConnected = false;
let pendingBriefs = [];

// Set up readline for MCP
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Connect to ADE WebSocket as L1_ORCH
function connectWebSocket() {
  process.stderr.write(`Connecting to ADE WebSocket: ${ADE_WS_URL}\n`);
  
  ws = new WebSocket(ADE_WS_URL);
  
  ws.on('open', () => {
    process.stderr.write('WebSocket connected\n');
    isConnected = true;
    
    // Register as L1_ORCH
    ws.send(JSON.stringify({
      type: 'agent_connect',
      agentId: 'L1_ORCH',
      capabilities: ['orchestration', 'coordination', 'planning'],
      metadata: {
        powered_by: 'Claude Desktop Pro',
        version: '1.0.0'
      }
    }));
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleWebSocketMessage(message);
    } catch (e) {
      // Try APML format
      handleAPMLMessage(data.toString());
    }
  });
  
  ws.on('close', () => {
    process.stderr.write('WebSocket disconnected, reconnecting...\n');
    isConnected = false;
    setTimeout(connectWebSocket, 5000);
  });
  
  ws.on('error', (error) => {
    process.stderr.write(`WebSocket error: ${error.message}\n`);
  });
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(message) {
  process.stderr.write(`WS Message: ${message.type}\n`);
  
  switch (message.type) {
    case 'user_request':
      // Brief from web UI user
      pendingBriefs.push({
        from: message.userId || 'web-user',
        request: message.request,
        sessionId: message.sessionId,
        timestamp: new Date().toISOString()
      });
      break;
      
    case 'connected':
      process.stderr.write('L1_ORCH registered successfully\n');
      break;
  }
}

// Handle APML messages
function handleAPMLMessage(apmlString) {
  // For now, add to pending briefs
  pendingBriefs.push({
    type: 'apml',
    content: apmlString,
    timestamp: new Date().toISOString()
  });
}

// MCP Request handling
rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    handleMCPRequest(request);
  } catch (e) {
    sendError(null, -32700, 'Parse error');
  }
});

function handleMCPRequest(request) {
  const { method, params, id } = request;
  
  switch (method) {
    case 'initialize':
      connectWebSocket(); // Connect when MCP initializes
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'ade-l1-orch',
          version: '1.0.0'
        }
      });
      break;
      
    case 'tools/list':
      sendResponse(id, {
        tools: [
          {
            name: 'check_briefs',
            description: 'Check for pending briefs from web UI',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'send_to_agent',
            description: 'Send APML message to specific agent',
            inputSchema: {
              type: 'object',
              properties: {
                agentId: { type: 'string' },
                type: { type: 'string' },
                content: { type: 'object' }
              },
              required: ['agentId', 'type', 'content']
            }
          },
          {
            name: 'create_worker',
            description: 'Create a specialized worker agent',
            inputSchema: {
              type: 'object',
              properties: {
                type: { 
                  type: 'string',
                  enum: ['architect', 'frontend', 'backend', 'tester']
                },
                taskId: { type: 'string' }
              },
              required: ['type']
            }
          },
          {
            name: 'orchestrate_build',
            description: 'Orchestrate a complete build',
            inputSchema: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                appType: { type: 'string' }
              },
              required: ['description']
            }
          },
          {
            name: 'report_progress',
            description: 'Send progress update to web UI',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                status: { type: 'string' },
                message: { type: 'string' }
              },
              required: ['status', 'message']
            }
          },
          {
            name: 'write_apml_file',
            description: 'Write APML specification to VFS',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path in VFS (e.g. /specs/app.apml)' },
                content: { type: 'string', description: 'APML content to write' },
                metadata: { 
                  type: 'object',
                  description: 'Optional metadata',
                  properties: {
                    phase: { type: 'string' },
                    timestamp: { type: 'string' },
                    from: { type: 'string' }
                  }
                }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'read_vfs_file',
            description: 'Read file from VFS',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path to read' }
              },
              required: ['path']
            }
          },
          {
            name: 'list_vfs_files',
            description: 'List all files in VFS',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      });
      break;
      
    case 'tools/call':
      handleToolCall(params.name, params.arguments || {}, id);
      break;
      
    default:
      sendError(id, -32601, 'Method not found');
  }
}

function handleToolCall(tool, args, id) {
  switch (tool) {
    case 'check_briefs':
      const briefs = [...pendingBriefs];
      pendingBriefs = []; // Clear after reading
      sendResponse(id, {
        content: [{
          type: 'text',
          text: briefs.length > 0 
            ? `Found ${briefs.length} pending briefs:\n${JSON.stringify(briefs, null, 2)}`
            : 'No pending briefs'
        }]
      });
      break;
      
    case 'send_to_agent':
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'apml_message',
          from: 'L1_ORCH',
          to: args.agentId,
          messageType: args.type,
          content: args.content
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Sent ${args.type} to ${args.agentId}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'create_worker':
      // This would create a worker agent
      sendResponse(id, {
        content: [{
          type: 'text',
          text: `Would create ${args.type} worker (not implemented yet)`
        }]
      });
      break;
      
    case 'orchestrate_build':
      // High-level orchestration
      if (ws && isConnected) {
        // Send initial brief to all agents
        ws.send(JSON.stringify({
          type: 'apml_message',
          from: 'L1_ORCH',
          to: 'broadcast',
          messageType: 'brief',
          content: {
            task: 'build_application',
            description: args.description,
            appType: args.appType || 'web'
          }
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Started orchestrating build: ${args.description}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'report_progress':
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'agent_response',
          userId: args.userId || 'web-user',
          from: 'L1_ORCH',
          status: args.status,
          message: args.message
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Progress reported: ${args.status}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'write_apml_file':
      if (ws && isConnected) {
        // Send VFS write command via WebSocket
        ws.send(JSON.stringify({
          type: 'vfs_write',
          from: 'L1_ORCH',
          content: {
            path: args.path,
            content: args.content,
            metadata: args.metadata || {
              from: 'L1_ORCH',
              timestamp: new Date().toISOString()
            }
          }
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Writing APML file to VFS: ${args.path}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'read_vfs_file':
      // Make HTTP request to read VFS file
      const readUrl = `${ADE_HTTP_URL}/api/vfs/${args.path}`;
      http.get(readUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          sendResponse(id, {
            content: [{
              type: 'text',
              text: data
            }]
          });
        });
      }).on('error', (err) => {
        sendError(id, -32603, `Failed to read VFS: ${err.message}`);
      });
      break;
      
    case 'list_vfs_files':
      // Make HTTP request to list VFS files
      http.get(`${ADE_HTTP_URL}/api/vfs`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          sendResponse(id, {
            content: [{
              type: 'text',
              text: data
            }]
          });
        });
      }).on('error', (err) => {
        sendError(id, -32603, `Failed to list VFS: ${err.message}`);
      });
      break;
      
    default:
      sendError(id, -32602, 'Unknown tool');
  }
}

// MCP response helpers
function sendResponse(id, result) {
  console.log(JSON.stringify({
    jsonrpc: '2.0',
    id: id,
    result: result
  }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({
    jsonrpc: '2.0',
    id: id,
    error: {
      code: code,
      message: message
    }
  }));
}

// Start
process.stderr.write('ADE L1_ORCH MCP Server starting...\n');