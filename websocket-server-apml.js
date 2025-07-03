// APML-enabled WebSocket Server
// Supports both APML and legacy JSON messages

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const path = require('path');
const DeploymentWebSocketHandler = require('./deployment-websocket-handler');
const VFSStorageHandler = require('./vfs-storage-handler');
const { APMLWebSocketServer } = require('./apml-websocket-adapter');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve shared files
app.get('/shared-nav-styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'shared-nav-styles.css'));
});

app.get('/nav-component.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'nav-component.js'));
});

app.get('/apml-to-live-preview.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-to-live-preview.js'));
});

app.get('/apml-app-visualizer.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-app-visualizer.js'));
});

// Serve interfaces
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-home.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'l1-orch-interface.html'));
});

app.get('/visualizer', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-app-flow-visualizer.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'vfs-enhanced-dashboard.html'));
});

app.get('/builder', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-builder-interface.html'));
});

app.get('/cost-calculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-cost-calculator.html'));
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

// Create WebSocket server with APML support
const wss = new WebSocket.Server({ server });
const apmlServer = new APMLWebSocketServer(wss);

// Initialize handlers
const deploymentHandler = new DeploymentWebSocketHandler(wss);
const vfsHandler = new VFSStorageHandler('./vfs-storage');

// Listen for VFS updates
vfsHandler.on('vfs_update', (update) => {
  apmlServer.broadcast({
    type: 'status',
    from: 'vfs',
    to: 'broadcast',
    status: {
      state: 'file_update',
      message: `File ${update.operation} at ${update.path}`,
      details: update
    }
  });
});

vfsHandler.on('vfs_error', (error) => {
  apmlServer.broadcast({
    type: 'error',
    from: 'vfs',
    to: 'broadcast',
    error: {
      message: error.message,
      details: error
    }
  });
});

// Add VFS operation handler to APML server
apmlServer.handleVFSOperation = async function(clientId, operation) {
  try {
    const result = await vfsHandler.handleVFSOperation(operation);
    
    const client = this.clients.get(clientId);
    if (client) {
      client.adapter.send({
        type: 'result',
        from: 'vfs',
        to: clientId,
        result: {
          success: true,
          summary: 'VFS operation complete',
          details: result
        }
      });
    }
  } catch (error) {
    const client = this.clients.get(clientId);
    if (client) {
      client.adapter.sendError(error.message);
    }
  }
};

console.log('ADE WebSocket Hub ready with APML support!');
console.log('Accepts both APML and JSON messages for backward compatibility');
console.log('WebSocket endpoint: ws://localhost:3000 (wss:// in production)');