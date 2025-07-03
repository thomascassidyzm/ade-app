// APML WebSocket Adapter
// Wraps WebSocket connections to use APML protocol

const APMLProtocol = require('./apml-protocol');

class APMLWebSocketAdapter {
  constructor(ws) {
    this.ws = ws;
    this.protocol = new APMLProtocol();
    this.handlers = new Map();
    
    // Set up message handling
    this.ws.on('message', (data) => {
      this.handleMessage(data);
    });
  }

  // Handle incoming messages (APML or JSON)
  async handleMessage(data) {
    try {
      let message;
      
      // Try to parse as JSON first (for backward compatibility)
      try {
        message = JSON.parse(data);
        // Convert JSON to APML format
        message = this.jsonToAPMLMessage(message);
      } catch {
        // Parse as APML
        message = this.protocol.parseAPML(data.toString());
      }
      
      // Validate message
      const validation = this.protocol.validate(message);
      if (!validation.valid) {
        this.sendError(validation.error);
        return;
      }
      
      // Route to appropriate handler
      const handler = this.handlers.get(message.type);
      if (handler) {
        await handler(message);
      } else {
        console.log(`No handler for message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(error.message);
    }
  }

  // Register a handler for a message type
  on(messageType, handler) {
    this.handlers.set(messageType, handler);
  }

  // Send APML message
  send(message) {
    if (typeof message === 'string') {
      // Already APML format
      this.ws.send(message);
    } else {
      // Convert to APML
      const apml = this.protocol.toAPML(message);
      this.ws.send(apml);
    }
  }

  // Send error message
  sendError(error) {
    const errorMessage = this.protocol.createMessage(
      'error',
      'system',
      'sender',
      { error: { message: error } }
    );
    this.send(errorMessage);
  }

  // Convert legacy JSON to APML message format
  jsonToAPMLMessage(json) {
    // Map old message types to APML types
    const typeMap = {
      'register_agent': 'register',
      'user_request': 'request',
      'agent_response': 'response',
      'agent_progress': 'progress',
      'vfs_operation': 'vfs'
    };
    
    const apmlType = typeMap[json.type] || json.type;
    
    // Build APML message structure
    const apmlMessage = {
      type: apmlType,
      from: json.from || json.agentId || json.userId || 'unknown',
      to: json.to || 'hub',
      timestamp: new Date().toISOString()
    };
    
    // Map specific message types
    switch (json.type) {
      case 'register_agent':
        apmlMessage.agent = {
          id: json.agentId,
          capabilities: json.capabilities?.join(', ') || '',
          layer: json.layer || 'L3'
        };
        break;
        
      case 'user_request':
        apmlMessage.request = {
          text: json.request,
          sessionId: json.sessionId
        };
        break;
        
      case 'agent_response':
        apmlMessage.response = {
          content: json.content || json.response,
          status: json.status || 'complete'
        };
        break;
        
      default:
        // Copy other fields
        Object.entries(json).forEach(([key, value]) => {
          if (!['type', 'from', 'to', 'timestamp'].includes(key)) {
            apmlMessage[key] = value;
          }
        });
    }
    
    return apmlMessage;
  }

  // Helper methods for common operations
  
  // Register an agent
  registerAgent(agentId, capabilities, layer) {
    const message = this.protocol.createRegisterMessage(agentId, capabilities, layer);
    this.send(message);
  }

  // Send a brief to another agent
  sendBrief(to, task, context) {
    const message = this.protocol.createBriefMessage(this.agentId, to, task, context);
    this.send(message);
  }

  // Send a handoff package
  sendHandoff(to, specification) {
    const message = this.protocol.createHandoffMessage(this.agentId, to, specification);
    this.send(message);
  }

  // Update status
  updateStatus(to, status, details) {
    const message = this.protocol.createStatusMessage(this.agentId, to, status, details);
    this.send(message);
  }

  // Send result
  sendResult(to, result, artifacts) {
    const message = this.protocol.createResultMessage(this.agentId, to, result, artifacts);
    this.send(message);
  }
}

// WebSocket Server wrapper that uses APML
class APMLWebSocketServer {
  constructor(wss) {
    this.wss = wss;
    this.clients = new Map();
    this.agents = new Map();
    
    // Handle new connections
    this.wss.on('connection', (ws, req) => {
      const clientId = Math.random().toString(36).substring(7);
      const adapter = new APMLWebSocketAdapter(ws);
      
      this.clients.set(clientId, {
        adapter,
        ws,
        type: null,
        agentId: null
      });
      
      // Set up handlers
      this.setupHandlers(clientId, adapter);
      
      // Send welcome message in APML format
      adapter.send({
        type: 'status',
        from: 'hub',
        to: clientId,
        status: {
          state: 'connected',
          message: 'Connected to ADE WebSocket Hub (APML mode)'
        }
      });
      
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });
    });
  }

  setupHandlers(clientId, adapter) {
    const client = this.clients.get(clientId);
    
    // Handle agent registration
    adapter.on('register', (message) => {
      client.type = 'agent';
      client.agentId = message.agent.id;
      client.layer = message.agent.layer;
      client.capabilities = message.agent.capabilities;
      
      this.agents.set(message.agent.id, client);
      
      // Send confirmation
      adapter.send({
        type: 'status',
        from: 'hub',
        to: message.from,
        status: {
          state: 'registered',
          message: `Agent ${message.agent.id} registered successfully`
        }
      });
      
      this.broadcastAgentList();
    });
    
    // Handle user requests
    adapter.on('request', (message) => {
      client.type = 'user';
      
      // Find L1_ORCH
      const l1Orch = Array.from(this.agents.values()).find(
        agent => agent.layer === 'L1' || agent.agentId === 'L1_ORCH'
      );
      
      if (l1Orch) {
        l1Orch.adapter.send(message);
      } else {
        adapter.sendError('No L1_ORCH agent available');
      }
    });
    
    // Handle briefs (L1 → L2)
    adapter.on('brief', (message) => {
      const targetAgent = this.agents.get(message.to);
      if (targetAgent) {
        targetAgent.adapter.send(message);
      }
    });
    
    // Handle handoffs (L2 → L3)
    adapter.on('handoff', (message) => {
      const targetAgent = this.agents.get(message.to);
      if (targetAgent) {
        targetAgent.adapter.send(message);
      }
    });
    
    // Handle status updates
    adapter.on('status', (message) => {
      // Route to appropriate recipient
      if (message.to === 'broadcast') {
        this.broadcast(message);
      } else {
        const target = this.findClient(message.to);
        if (target) {
          target.adapter.send(message);
        }
      }
    });
    
    // Handle results
    adapter.on('result', (message) => {
      const target = this.findClient(message.to);
      if (target) {
        target.adapter.send(message);
      }
    });
  }

  findClient(identifier) {
    // Check if it's an agent ID
    if (this.agents.has(identifier)) {
      return this.agents.get(identifier);
    }
    
    // Check if it's a client ID
    return this.clients.get(identifier);
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (client?.agentId) {
      this.agents.delete(client.agentId);
      this.broadcastAgentList();
    }
    this.clients.delete(clientId);
  }

  broadcastAgentList() {
    const agentList = Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      layer: agent.layer,
      capabilities: agent.capabilities,
      status: 'online'
    }));
    
    this.broadcast({
      type: 'status',
      from: 'hub',
      to: 'broadcast',
      status: {
        state: 'agent_list_update',
        agents: agentList
      }
    });
  }

  broadcast(message) {
    this.clients.forEach(client => {
      if (client.ws.readyState === 1) { // OPEN
        client.adapter.send(message);
      }
    });
  }
}

module.exports = { APMLWebSocketAdapter, APMLWebSocketServer };