#!/usr/bin/env node
/**
 * MCP Proxy for ADE
 * Connects Claude Desktop to the Railway-deployed ADE server
 */

const readline = require('readline');
const https = require('https');

const ADE_SERVER = process.env.ADE_SERVER_URL || 'https://ade-app.up.railway.app';

// Set up stdio for MCP communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Log to stderr so it doesn't interfere with MCP protocol
function log(...args) {
  console.error('[ADE-APML]', ...args);
}

log(`Starting MCP proxy for ${ADE_SERVER}`);

// Forward requests to ADE server
async function forwardToADE(request) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(request);
    
    const options = {
      hostname: ADE_SERVER.replace('https://', '').replace('http://', ''),
      port: 443,
      path: '/api/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (error) {
          reject(new Error(`Invalid response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Handle incoming MCP requests
rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    log('Received request:', request.method);
    
    // Forward to ADE server
    const response = await forwardToADE(request);
    
    // Send response back to Claude
    console.log(JSON.stringify(response));
    
  } catch (error) {
    log('Error:', error.message);
    
    // Send error response
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: error.message
      }
    };
    
    console.log(JSON.stringify(errorResponse));
  }
});

// Handle process termination
process.on('SIGINT', () => {
  log('Shutting down MCP proxy');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Shutting down MCP proxy');
  process.exit(0);
});

log('MCP proxy ready');