/**
 * L1_ORCH Bridge - Bidirectional communication between Web UI and Claude Desktop
 * This runs locally and bridges WebSocket ↔ Local WebSocket
 */

const WebSocket = require('ws');
const express = require('express');

// Configuration
const REMOTE_ADE = 'wss://ade-app.up.railway.app';
const LOCAL_PORT = 8765;

// Create local WebSocket server for Claude Desktop
const wss = new WebSocket.Server({ port: LOCAL_PORT });
let remoteWs = null;
let localClients = new Set();

console.log(`L1_ORCH Bridge started on ws://localhost:${LOCAL_PORT}`);

// Connect to remote ADE server
function connectToRemote() {
  console.log(`Connecting to remote ADE: ${REMOTE_ADE}`);
  
  remoteWs = new WebSocket(REMOTE_ADE);
  
  remoteWs.on('open', () => {
    console.log('Connected to remote ADE');
    
    // Register as L1_ORCH
    remoteWs.send(JSON.stringify({
      type: 'agent_connect',
      agentId: 'L1_ORCH',
      capabilities: ['orchestration', 'coordination', 'planning'],
      metadata: {
        bridge_version: '1.0.0'
      }
    }));
  });
  
  remoteWs.on('message', (data) => {
    console.log('From Remote:', data.toString().substring(0, 100));
    
    // Forward to all local clients (Claude Desktop)
    for (const client of localClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  });
  
  remoteWs.on('close', () => {
    console.log('Remote connection closed, reconnecting...');
    setTimeout(connectToRemote, 5000);
  });
  
  remoteWs.on('error', (error) => {
    console.error('Remote connection error:', error.message);
  });
}

// Handle local connections (from Claude Desktop or terminal)
wss.on('connection', (ws) => {
  console.log('Local client connected');
  localClients.add(ws);
  
  // Send connection status
  ws.send(JSON.stringify({
    type: 'bridge_status',
    connected_to_remote: remoteWs?.readyState === WebSocket.OPEN,
    message: 'Connected to L1_ORCH bridge'
  }));
  
  ws.on('message', (data) => {
    console.log('From Local:', data.toString().substring(0, 100));
    
    // Forward to remote ADE
    if (remoteWs && remoteWs.readyState === WebSocket.OPEN) {
      remoteWs.send(data);
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not connected to remote ADE'
      }));
    }
  });
  
  ws.on('close', () => {
    localClients.delete(ws);
    console.log('Local client disconnected');
  });
});

// Also create HTTP endpoint for status
const app = express();
app.get('/status', (req, res) => {
  res.json({
    bridge: 'running',
    remote_connected: remoteWs?.readyState === WebSocket.OPEN,
    local_clients: localClients.size,
    timestamp: new Date().toISOString()
  });
});

app.listen(LOCAL_PORT + 1, () => {
  console.log(`Status endpoint: http://localhost:${LOCAL_PORT + 1}/status`);
});

// Connect to remote on startup
connectToRemote();

// Keep process alive
process.on('SIGINT', () => {
  console.log('\nShutting down bridge...');
  process.exit(0);
});