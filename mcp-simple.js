#!/usr/bin/env node
/**
 * Simple MCP Server for ADE - Minimal crash-safe implementation
 */

const readline = require('readline');
const https = require('https');

// Constants
const ADE_HOST = 'ade-app.up.railway.app';

// Set up readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Process lines of input
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
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'ade-simple',
          version: '1.0.0'
        }
      });
      break;
      
    case 'tools/list':
      sendResponse(id, {
        tools: [
          {
            name: 'ade_status',
            description: 'Check ADE server status',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'ade_agents',
            description: 'List ADE agents',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'ade_build',
            description: 'Build an app with ADE',
            inputSchema: {
              type: 'object',
              properties: {
                description: { type: 'string' }
              },
              required: ['description']
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
    case 'ade_status':
      httpsGet('/api/health', (data) => {
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `ADE Status:\n${data}`
          }]
        });
      });
      break;
      
    case 'ade_agents':
      httpsGet('/api/agents', (data) => {
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `ADE Agents:\n${data}`
          }]
        });
      });
      break;
      
    case 'ade_build':
      sendResponse(id, {
        content: [{
          type: 'text',
          text: `Starting build: ${args.description}\n\nVisit https://ade-app.up.railway.app to monitor progress.`
        }]
      });
      break;
      
    default:
      sendError(id, -32602, 'Unknown tool');
  }
}

function httpsGet(path, callback) {
  https.get({
    hostname: ADE_HOST,
    path: path,
    headers: { 'Accept': 'application/apml' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => callback(data));
  }).on('error', (e) => {
    callback(`Error: ${e.message}`);
  });
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

// Start message
process.stderr.write('ADE Simple MCP Server started\n');