// APML Message Broker - Core communication infrastructure for all agents
const EventEmitter = require('events');

class APMLMessageBroker extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map(); // agentId -> agent info
    this.subscriptions = new Map(); // topic -> Set of agentIds
    this.messageLog = []; // For debugging and replay
    this.vfsHandler = null;
  }

  // Set VFS handler for automatic output routing
  setVFSHandler(handler) {
    this.vfsHandler = handler;
  }

  // Register an agent with its capabilities
  registerAgent(agentId, capabilities, websocket) {
    const agentInfo = {
      id: agentId,
      capabilities: capabilities || [],
      websocket: websocket,
      status: 'online',
      registeredAt: new Date().toISOString()
    };

    this.agents.set(agentId, agentInfo);
    
    // Auto-subscribe to agent's own messages and broadcasts
    this.subscribe(agentId, `agent.${agentId}`);
    this.subscribe(agentId, 'broadcast');
    
    // Log registration to VFS
    if (this.vfsHandler) {
      this.vfsHandler.writeFile(
        `agents/${agentId}/registration.json`,
        JSON.stringify(agentInfo, null, 2)
      );
    }

    this.emit('agent_registered', agentInfo);
    console.log(`Agent registered: ${agentId} with capabilities: ${capabilities.join(', ')}`);
  }

  // Unregister an agent
  unregisterAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Remove from all subscriptions
    this.subscriptions.forEach((subscribers, topic) => {
      subscribers.delete(agentId);
    });

    // Update status in VFS
    if (this.vfsHandler) {
      this.vfsHandler.writeFile(
        `agents/${agentId}/status.json`,
        JSON.stringify({ status: 'offline', timestamp: new Date().toISOString() })
      );
    }

    this.agents.delete(agentId);
    this.emit('agent_unregistered', { agentId });
    console.log(`Agent unregistered: ${agentId}`);
  }

  // Subscribe an agent to a topic
  subscribe(agentId, topic) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not registered`);
    }

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    
    this.subscriptions.get(topic).add(agentId);
    console.log(`Agent ${agentId} subscribed to topic: ${topic}`);
  }

  // Send APML message between agents
  sendMessage(fromAgent, toAgent, messageType, content) {
    const message = {
      apml: '1.0',
      type: messageType,
      from: fromAgent,
      to: toAgent,
      timestamp: new Date().toISOString(),
      content: content
    };

    // Log all messages to VFS for debugging
    if (this.vfsHandler) {
      const logPath = `messages/${new Date().toISOString().split('T')[0]}/${fromAgent}-to-${toAgent}-${Date.now()}.apml`;
      this.vfsHandler.writeFile(logPath, this.formatAPML(message));
    }

    // Store in memory log
    this.messageLog.push(message);
    if (this.messageLog.length > 1000) {
      this.messageLog.shift(); // Keep last 1000 messages
    }

    // Direct message
    if (toAgent !== 'broadcast') {
      const recipient = this.agents.get(toAgent);
      if (recipient && recipient.websocket) {
        recipient.websocket.send(JSON.stringify({
          type: 'apml_message',
          message: message
        }));
      }
      return message;
    }

    // Broadcast message
    const topic = `agent.${toAgent}`;
    const subscribers = this.subscriptions.get(topic) || new Set();
    
    subscribers.forEach(agentId => {
      if (agentId !== fromAgent) { // Don't send back to sender
        const agent = this.agents.get(agentId);
        if (agent && agent.websocket) {
          agent.websocket.send(JSON.stringify({
            type: 'apml_message',
            message: message
          }));
        }
      }
    });

    return message;
  }

  // Send a brief (task assignment)
  sendBrief(fromAgent, toAgent, task, context = {}) {
    const brief = {
      task: task,
      context: context,
      expectedOutput: context.expectedOutput || 'Complete the task and report results',
      deadline: context.deadline || 'none',
      priority: context.priority || 'normal'
    };

    return this.sendMessage(fromAgent, toAgent, 'brief', brief);
  }

  // Send a report (task completion)
  sendReport(fromAgent, toAgent, taskId, results, status = 'completed') {
    const report = {
      taskId: taskId,
      status: status,
      results: results,
      completedAt: new Date().toISOString()
    };

    // Auto-save reports to VFS
    if (this.vfsHandler && results.outputFiles) {
      results.outputFiles.forEach(file => {
        this.vfsHandler.writeFile(file.path, file.content);
      });
    }

    return this.sendMessage(fromAgent, toAgent, 'report', report);
  }

  // Query agent capabilities
  queryCapabilities(capability) {
    const capableAgents = [];
    this.agents.forEach((agent, agentId) => {
      if (agent.capabilities.includes(capability)) {
        capableAgents.push({
          agentId: agentId,
          capabilities: agent.capabilities,
          status: agent.status
        });
      }
    });
    return capableAgents;
  }

  // Get all online agents
  getOnlineAgents() {
    const online = [];
    this.agents.forEach((agent, agentId) => {
      if (agent.status === 'online') {
        online.push({
          agentId: agentId,
          capabilities: agent.capabilities
        });
      }
    });
    return online;
  }

  // Format message as APML
  formatAPML(message) {
    return `---
apml: ${message.apml}
type: ${message.type}
from: ${message.from}
to: ${message.to}
timestamp: ${message.timestamp}
---
${JSON.stringify(message.content, null, 2)}`;
  }

  // Parse APML format
  parseAPML(apmlString) {
    const lines = apmlString.split('\n');
    const metadata = {};
    let contentStart = 0;

    // Parse metadata
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '---') {
        if (i > 0) {
          contentStart = i + 1;
          break;
        }
      } else if (i > 0) {
        const [key, ...valueParts] = lines[i].split(':');
        if (key) {
          metadata[key.trim()] = valueParts.join(':').trim();
        }
      }
    }

    // Parse content
    const contentLines = lines.slice(contentStart);
    const content = JSON.parse(contentLines.join('\n'));

    return {
      ...metadata,
      content
    };
  }
}

module.exports = APMLMessageBroker;