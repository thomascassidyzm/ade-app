#!/usr/bin/env node

// MCP Bridge - Connects Claude Desktop to ADE WebApp
// This runs locally and bridges stdio (Claude Desktop) to HTTP (WebApp)
//
// Usage: Set these environment variables:
//   ADE_URL=https://ade-app.up.railway.app
//   ADE_API_KEY=your-secret-key

const readline = require('readline');
const axios = require('axios');

const ADE_URL = process.env.ADE_URL || 'http://localhost:3000';
const API_KEY = process.env.ADE_API_KEY;

// Setup stdio interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Buffer for incomplete JSON
let buffer = '';

// Log function that doesn't interfere with stdio
function log(...args) {
  console.error('[MCP Bridge]', ...args);
}

log(`Starting MCP bridge to ${ADE_URL}`);
log(`API Key configured: ${API_KEY ? 'Yes' : 'No'}`);

// Handle incoming messages from Claude Desktop
rl.on('line', async (line) => {
  buffer += line;
  
  try {
    // Try to parse the JSON
    const message = JSON.parse(buffer);
    buffer = ''; // Clear buffer on successful parse
    
    log('Received:', message.method || message.type);
    
    // Forward to webapp
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-MCP-Bridge': 'claude-desktop'
      };
      
      // Add API key if provided
      if (API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }
      
      const response = await axios.post(`${ADE_URL}/mcp`, message, { headers });
      
      // Send response back to Claude Desktop
      const responseStr = JSON.stringify(response.data);
      console.log(responseStr);
      
    } catch (error) {
      log('Error forwarding to webapp:', error.message);
      
      // Send error response
      const errorResponse = {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: `Bridge error: ${error.message}`
        }
      };
      console.log(JSON.stringify(errorResponse));
    }
    
  } catch (parseError) {
    // Not valid JSON yet, keep buffering
    if (buffer.length > 1000000) {
      // Prevent buffer overflow
      log('Buffer overflow, clearing');
      buffer = '';
    }
  }
});

// Handle errors
process.on('uncaughtException', (error) => {
  log('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  log('Unhandled rejection:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down');
  process.exit(0);
});

log('Bridge ready, waiting for messages...');