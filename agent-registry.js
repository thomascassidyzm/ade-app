// Agent Registry - Manages agent registration and capability discovery
const EventEmitter = require('events');

class AgentRegistry extends EventEmitter {
  constructor(messageBroker, vfsHandler) {
    super();
    this.broker = messageBroker;
    this.vfs = vfsHandler;
    this.agents = new Map();
    this.capabilities = new Map(); // capability -> Set of agentIds
    this.agentTokens = new Map(); // agentId -> token (for auth)
  }

  // Register a new agent
  async registerAgent(agentId, config, websocket) {
    // Validate config
    if (!config.capabilities || !Array.isArray(config.capabilities)) {
      throw new Error('Agent must declare capabilities array');
    }

    // Generate auth token
    const token = this.generateToken();
    
    // Create agent record
    const agent = {
      id: agentId,
      name: config.name || agentId,
      version: config.version || '1.0.0',
      capabilities: config.capabilities,
      description: config.description || '',
      inputFormats: config.inputFormats || ['text', 'apml'],
      outputFormats: config.outputFormats || ['text', 'json', 'apml'],
      websocket: websocket,
      status: 'online',
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      metadata: config.metadata || {}
    };

    // Store agent
    this.agents.set(agentId, agent);
    this.agentTokens.set(agentId, token);

    // Update capability index
    for (const capability of config.capabilities) {
      if (!this.capabilities.has(capability)) {
        this.capabilities.set(capability, new Set());
      }
      this.capabilities.get(capability).add(agentId);
    }

    // Register with message broker
    this.broker.registerAgent(agentId, config.capabilities, websocket);

    // Persist to VFS
    await this.saveAgentRegistry();

    // Write agent manifest
    await this.vfs.writeFile(
      `agents/${agentId}/manifest.json`,
      JSON.stringify({
        ...agent,
        token: token // Include token for agent to use
      }, null, 2)
    );

    // Emit registration event
    this.emit('agent:registered', { agentId, capabilities: config.capabilities });

    console.log(`Agent registered: ${agentId} with capabilities: ${config.capabilities.join(', ')}`);
    
    return { agentId, token };
  }

  // Unregister agent
  async unregisterAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Remove from capability index
    for (const capability of agent.capabilities) {
      const capAgents = this.capabilities.get(capability);
      if (capAgents) {
        capAgents.delete(agentId);
        if (capAgents.size === 0) {
          this.capabilities.delete(capability);
        }
      }
    }

    // Unregister from message broker
    this.broker.unregisterAgent(agentId);

    // Update status in VFS
    await this.vfs.writeFile(
      `agents/${agentId}/status.json`,
      JSON.stringify({
        status: 'offline',
        unregisteredAt: new Date().toISOString()
      })
    );

    // Remove from registry
    this.agents.delete(agentId);
    this.agentTokens.delete(agentId);

    // Persist changes
    await this.saveAgentRegistry();

    // Emit event
    this.emit('agent:unregistered', { agentId });

    console.log(`Agent unregistered: ${agentId}`);
  }

  // Find agents by capability
  findAgentsByCapability(capability) {
    const agentIds = this.capabilities.get(capability) || new Set();
    const agents = [];
    
    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (agent && agent.status === 'online') {
        agents.push({
          id: agent.id,
          name: agent.name,
          capabilities: agent.capabilities,
          description: agent.description
        });
      }
    }
    
    return agents;
  }

  // Find best agent for a task
  findBestAgent(requiredCapabilities, preferredCapabilities = []) {
    // Find agents that have all required capabilities
    const candidates = [];
    
    for (const [agentId, agent] of this.agents) {
      if (agent.status !== 'online') continue;
      
      const hasAllRequired = requiredCapabilities.every(cap => 
        agent.capabilities.includes(cap)
      );
      
      if (hasAllRequired) {
        // Calculate score based on preferred capabilities
        const preferredCount = preferredCapabilities.filter(cap =>
          agent.capabilities.includes(cap)
        ).length;
        
        candidates.push({
          agent: agent,
          score: preferredCount
        });
      }
    }
    
    // Sort by score and return best match
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.agent || null;
  }

  // Get agent info
  getAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    
    // Don't expose websocket or token
    const { websocket, ...agentInfo } = agent;
    return agentInfo;
  }

  // Get all agents
  getAllAgents() {
    const agents = [];
    for (const [agentId, agent] of this.agents) {
      const { websocket, ...agentInfo } = agent;
      agents.push(agentInfo);
    }
    return agents;
  }

  // Get all capabilities
  getAllCapabilities() {
    const capabilityList = [];
    for (const [capability, agentIds] of this.capabilities) {
      capabilityList.push({
        capability: capability,
        agents: Array.from(agentIds),
        count: agentIds.size
      });
    }
    return capabilityList;
  }

  // Validate agent token
  validateToken(agentId, token) {
    return this.agentTokens.get(agentId) === token;
  }

  // Update agent status
  async updateAgentStatus(agentId, status) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = status;
    agent.lastSeen = new Date().toISOString();

    // Emit status change
    this.emit('agent:status', { agentId, status });

    // Update in VFS
    await this.vfs.writeFile(
      `agents/${agentId}/status.json`,
      JSON.stringify({
        status: status,
        lastSeen: agent.lastSeen
      })
    );
  }

  // Heartbeat from agent
  async heartbeat(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.lastSeen = new Date().toISOString();
    
    // Check if agent was offline
    if (agent.status === 'offline') {
      agent.status = 'online';
      this.emit('agent:online', { agentId });
    }
    
    return true;
  }

  // Generate secure token
  generateToken() {
    return Math.random().toString(36).substring(2) + 
           Math.random().toString(36).substring(2) +
           Date.now().toString(36);
  }

  // Save registry to VFS
  async saveAgentRegistry() {
    const registry = {
      agents: Array.from(this.agents.entries()).map(([id, agent]) => ({
        id: id,
        ...this.sanitizeAgent(agent)
      })),
      capabilities: Array.from(this.capabilities.entries()).map(([cap, agents]) => ({
        capability: cap,
        agents: Array.from(agents)
      })),
      timestamp: new Date().toISOString()
    };

    await this.vfs.writeFile(
      'system/agent-registry.json',
      JSON.stringify(registry, null, 2)
    );
  }

  // Remove sensitive data from agent object
  sanitizeAgent(agent) {
    const { websocket, ...safe } = agent;
    return safe;
  }

  // Load registry from VFS
  async loadRegistry() {
    try {
      const data = await this.vfs.readFile('system/agent-registry.json');
      const registry = JSON.parse(data);
      
      // Restore agents (without websockets)
      for (const agentData of registry.agents) {
        const { id, ...agent } = agentData;
        agent.status = 'offline'; // All loaded agents start offline
        this.agents.set(id, agent);
        
        // Restore capability index
        for (const capability of agent.capabilities) {
          if (!this.capabilities.has(capability)) {
            this.capabilities.set(capability, new Set());
          }
          this.capabilities.get(capability).add(id);
        }
      }
      
      console.log(`Loaded ${this.agents.size} agents from registry`);
    } catch (error) {
      console.log('No existing agent registry found');
    }
  }
}

module.exports = AgentRegistry;