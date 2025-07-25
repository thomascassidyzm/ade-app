#!/usr/bin/env node
/**
 * MCP WebSocket Client - Provides bidirectional communication
 */

const readline = require('readline');
const WebSocket = require('ws');

// Configuration
const BRIDGE_URL = process.env.BRIDGE_URL || 'ws://localhost:8765';

// State
let ws = null;
let isConnected = false;
let messageQueue = [];
let messageCounter = 0;

// Format object as APML string
function formatAPML(obj) {
  let result = '---\n';
  
  // Header fields in specific order
  const headerFields = ['apml', 'type', 'from', 'to', 'timestamp'];
  for (const field of headerFields) {
    if (obj[field] !== undefined) {
      result += `${field}: ${obj[field]}\n`;
    }
  }
  
  result += '---\n';
  
  // Format content
  if (obj.content) {
    result += formatObject(obj.content, 'content');
  }
  
  return result;
}

function formatObject(obj, key, indent = '') {
  let result = '';
  
  if (key) {
    result += `${indent}${key}:\n`;
    indent += '  ';
  }
  
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      result += formatObject(v, k, indent);
    } else if (Array.isArray(v)) {
      result += `${indent}${k}:\n`;
      for (const item of v) {
        result += `${indent}  - ${item}\n`;
      }
    } else if (typeof v === 'string' && v.includes('\n')) {
      // Multi-line strings
      result += `${indent}${k}: |\n`;
      v.split('\n').forEach(line => {
        result += `${indent}  ${line}\n`;
      });
    } else {
      result += `${indent}${k}: ${v}\n`;
    }
  }
  
  return result;
}

// Set up readline for MCP
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Connect to L1_ORCH bridge
function connect() {
  process.stderr.write(`Connecting to L1_ORCH bridge: ${BRIDGE_URL}\n`);
  
  ws = new WebSocket(BRIDGE_URL);
  
  ws.on('open', () => {
    process.stderr.write('Connected to L1_ORCH bridge\n');
    isConnected = true;
  });
  
  ws.on('message', (data) => {
    // Store messages for retrieval
    const message = {
      id: ++messageCounter,
      timestamp: new Date().toISOString(),
      data: data.toString()
    };
    messageQueue.push(message);
    
    // Keep only last 100 messages
    if (messageQueue.length > 100) {
      messageQueue.shift();
    }
    
    process.stderr.write(`Received message #${message.id}\n`);
    
    // Parse the message to check if it's for L1_ORCH
    try {
      const parsedData = data.toString();
      
      // Check if it's an APML message
      if (parsedData.includes('---\n')) {
        // Try to parse as APML
        const lines = parsedData.split('\n');
        let isForL1ORCH = false;
        
        for (const line of lines) {
          if (line.startsWith('to: L1_ORCH')) {
            isForL1ORCH = true;
            break;
          }
        }
        
        if (isForL1ORCH) {
          // Extract message content
          let messageContent = 'New message';
          const contentMatch = parsedData.match(/message:\s*(.+?)(?:\n|$)/);
          if (contentMatch) {
            messageContent = contentMatch[1].trim();
          }
          
          // Send notification to Claude Desktop
          sendNotification({
            method: 'notifications/message',
            params: {
              level: 'info',
              message: `📨 L1_ORCH: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`
            }
          });
          
          // Also send a tool notification to auto-trigger response
          sendNotification({
            method: 'notifications/tools/message',
            params: {
              type: 'new_message',
              from: 'user',
              preview: messageContent
            }
          });
        }
      }
    } catch (error) {
      process.stderr.write(`Error parsing message for notification: ${error}\n`);
    }
  });
  
  ws.on('close', () => {
    process.stderr.write('Disconnected from bridge\n');
    isConnected = false;
    setTimeout(connect, 5000);
  });
  
  ws.on('error', (error) => {
    process.stderr.write(`Bridge connection error: ${error.message}\n`);
  });
}

// MCP handlers
rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    handleRequest(request);
  } catch (e) {
    sendError(null, -32700, 'Parse error');
  }
});

function handleRequest(request) {
  const { method, params, id } = request;
  
  switch (method) {
    case 'initialize':
      connect();
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { 
          tools: {},
          prompts: {}
        },
        serverInfo: {
          name: 'ade-websocket',
          version: '1.0.0'
        }
      });
      break;
      
    case 'tools/list':
      sendResponse(id, {
        tools: [
          {
            name: 'get_messages',
            description: 'Get pending messages from Web UI',
            inputSchema: {
              type: 'object',
              properties: {
                count: { 
                  type: 'number',
                  description: 'Number of messages to retrieve'
                }
              },
              required: []
            }
          },
          {
            name: 'send_message',
            description: 'Send message to Web UI',
            inputSchema: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                content: { type: 'object' }
              },
              required: ['type', 'content']
            }
          },
          {
            name: 'send_apml',
            description: 'Send APML formatted message',
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
            name: 'get_status',
            description: 'Get connection status',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      });
      break;
      
    case 'tools/call':
      handleToolCall(params.name, params.arguments || {}, id);
      break;
    
    case 'notifications/initialized':
      // Client is ready, no response needed
      process.stderr.write('MCP client initialized\n');
      break;
      
    default:
      sendError(id, -32601, 'Method not found');
  }
}

function handleToolCall(tool, args, id) {
  switch (tool) {
    case 'get_messages':
      const count = args.count || 10;
      const messages = messageQueue.slice(-count);
      sendResponse(id, {
        content: [{
          type: 'text',
          text: messages.length > 0
            ? `Last ${messages.length} messages:\n${messages.map(m => 
                `[${m.timestamp}] ${m.data}`
              ).join('\n---\n')}`
            : 'No messages yet'
        }]
      });
      // Clear retrieved messages
      messageQueue = [];
      break;
      
    case 'send_message':
      if (ws && isConnected) {
        ws.send(JSON.stringify(args));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Sent ${args.type} message`
          }]
        });
      } else {
        sendError(id, -32603, 'Not connected to bridge');
      }
      break;
      
    case 'send_apml':
      if (ws && isConnected) {
        // Convert to proper APML format
        const apmlMessage = {
          apml: '1.0',
          type: args.type || 'response',
          from: 'L1_ORCH',
          to: args.to || 'user',
          timestamp: new Date().toISOString(),
          content: args.content
        };
        
        // Convert to APML string format
        const apmlString = formatAPML(apmlMessage);
        
        // Send as APML
        ws.send(apmlString);
        
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Sent APML ${args.type} to ${args.to}`
          }]
        });
      } else {
        sendError(id, -32603, 'Not connected to bridge');
      }
      break;
      
    case 'get_status':
      sendResponse(id, {
        content: [{
          type: 'text',
          text: `Bridge connection: ${isConnected ? 'Connected' : 'Disconnected'}\nMessages in queue: ${messageQueue.length}`
        }]
      });
      break;
      
    default:
      sendError(id, -32602, 'Unknown tool');
  }
}

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

// Send notification to Claude Desktop
function sendNotification(notification) {
  const message = {
    jsonrpc: '2.0',
    ...notification
  };
  console.log(JSON.stringify(message));
}

process.stderr.write('MCP WebSocket Client started\n');