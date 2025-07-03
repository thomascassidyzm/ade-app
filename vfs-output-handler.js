// VFS Output Handler for Multi-Agent System
// All agent outputs go through VFS for web display

const WebSocket = require('ws');
const EventEmitter = require('events');

class VFSOutputHandler extends EventEmitter {
  constructor(wsUrl = 'wss://ade-app.up.railway.app') {
    super();
    this.wsUrl = wsUrl;
    this.ws = null;
    this.connected = false;
    this.outputBuffer = [];
    this.agentId = null;
    this.reconnectAttempts = 0;
    
    this.connect();
  }

  connect() {
    console.log(`VFS: Connecting to ${this.wsUrl}...`);
    this.ws = new WebSocket(this.wsUrl);
    
    this.ws.on('open', () => {
      console.log('VFS: Connected to ADE Hub');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Register as VFS handler
      this.ws.send(JSON.stringify({
        type: 'register_agent',
        agentId: 'vfs-handler',
        capabilities: ['file-system', 'output-display', 'agent-coordination']
      }));
      
      // Flush any buffered outputs
      this.flushBuffer();
    });
    
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(message);
      } catch (error) {
        console.error('VFS: Error parsing message:', error);
      }
    });
    
    this.ws.on('close', () => {
      console.log('VFS: Disconnected from hub');
      this.connected = false;
      this.scheduleReconnect();
    });
    
    this.ws.on('error', (error) => {
      console.error('VFS: WebSocket error:', error.message);
    });
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < 10) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`VFS: Reconnecting in ${delay}ms...`);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'registered':
        console.log('VFS: Registered with hub');
        break;
      case 'vfs_request':
        this.handleVFSRequest(message);
        break;
    }
  }

  handleVFSRequest(message) {
    // Handle file system requests from other agents
    const { operation, path, content } = message;
    
    switch (operation) {
      case 'read':
        this.emit('read', { path, requestId: message.requestId });
        break;
      case 'write':
        this.emit('write', { path, content, requestId: message.requestId });
        break;
      case 'list':
        this.emit('list', { path, requestId: message.requestId });
        break;
    }
  }

  // Main method: Write agent output to VFS
  writeOutput(agentId, outputType, content, metadata = {}) {
    const output = {
      agentId,
      outputType,
      content,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    if (this.connected) {
      this.sendOutput(output);
    } else {
      this.outputBuffer.push(output);
    }
    
    // Also emit locally for any listeners
    this.emit('output', output);
    
    return output;
  }

  sendOutput(output) {
    const vfsOperation = this.createVFSOperation(output);
    
    this.ws.send(JSON.stringify({
      type: 'vfs_operation',
      operation: vfsOperation
    }));
  }

  createVFSOperation(output) {
    const { agentId, outputType, content, metadata, timestamp } = output;
    
    // Determine file path based on output type
    let filePath;
    let fileContent;
    
    switch (outputType) {
      case 'apml':
        filePath = `/agents/${agentId}/apml/${timestamp.replace(/[:.]/g, '-')}.apml`;
        fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        break;
        
      case 'code':
        const ext = metadata.language || 'js';
        filePath = `/agents/${agentId}/code/${metadata.filename || `output-${Date.now()}.${ext}`}`;
        fileContent = content;
        break;
        
      case 'log':
        filePath = `/agents/${agentId}/logs/${new Date().toISOString().split('T')[0]}.log`;
        fileContent = `[${timestamp}] ${content}\n`;
        break;
        
      case 'status':
        filePath = `/agents/${agentId}/status.json`;
        fileContent = JSON.stringify({
          status: content,
          timestamp,
          ...metadata
        }, null, 2);
        break;
        
      case 'error':
        filePath = `/agents/${agentId}/errors/${timestamp.replace(/[:.]/g, '-')}.error`;
        fileContent = JSON.stringify({
          error: content,
          stack: metadata.stack,
          timestamp
        }, null, 2);
        break;
        
      case 'visualization':
        filePath = `/visualizations/${metadata.type || 'general'}/${agentId}-${Date.now()}.json`;
        fileContent = JSON.stringify(content, null, 2);
        break;
        
      default:
        filePath = `/agents/${agentId}/output/${outputType}-${Date.now()}.json`;
        fileContent = JSON.stringify({ content, metadata, timestamp }, null, 2);
    }
    
    return {
      type: 'write',
      path: filePath,
      content: fileContent,
      metadata: {
        agentId,
        outputType,
        ...metadata
      }
    };
  }

  flushBuffer() {
    if (this.outputBuffer.length > 0) {
      console.log(`VFS: Flushing ${this.outputBuffer.length} buffered outputs`);
      this.outputBuffer.forEach(output => this.sendOutput(output));
      this.outputBuffer = [];
    }
  }

  // Convenience methods for different output types
  logAPML(agentId, apmlMessage, metadata = {}) {
    return this.writeOutput(agentId, 'apml', apmlMessage, metadata);
  }

  logCode(agentId, code, filename, language = 'javascript') {
    return this.writeOutput(agentId, 'code', code, { filename, language });
  }

  logStatus(agentId, status, metadata = {}) {
    return this.writeOutput(agentId, 'status', status, metadata);
  }

  logError(agentId, error, stack = null) {
    return this.writeOutput(agentId, 'error', error.message || error, { stack });
  }

  log(agentId, message) {
    return this.writeOutput(agentId, 'log', message);
  }

  // Create visualization data for the APML visualizer
  createVisualization(agentId, vizType, data) {
    return this.writeOutput(agentId, 'visualization', data, { type: vizType });
  }

  // Get file from VFS
  async getFile(path) {
    return new Promise((resolve, reject) => {
      const requestId = `req-${Date.now()}`;
      
      const timeout = setTimeout(() => {
        reject(new Error('VFS read timeout'));
      }, 5000);
      
      const handler = (message) => {
        if (message.type === 'vfs_response' && message.requestId === requestId) {
          clearTimeout(timeout);
          this.ws.off('message', handler);
          resolve(message.content);
        }
      };
      
      this.ws.on('message', handler);
      
      this.ws.send(JSON.stringify({
        type: 'vfs_operation',
        operation: {
          type: 'read',
          path,
          requestId
        }
      }));
    });
  }

  // List files in VFS directory
  async listFiles(path) {
    return new Promise((resolve, reject) => {
      const requestId = `req-${Date.now()}`;
      
      const timeout = setTimeout(() => {
        reject(new Error('VFS list timeout'));
      }, 5000);
      
      const handler = (message) => {
        if (message.type === 'vfs_response' && message.requestId === requestId) {
          clearTimeout(timeout);
          this.ws.off('message', handler);
          resolve(message.files);
        }
      };
      
      this.ws.on('message', handler);
      
      this.ws.send(JSON.stringify({
        type: 'vfs_operation',
        operation: {
          type: 'list',
          path,
          requestId
        }
      }));
    });
  }

  // Close connection
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = VFSOutputHandler;