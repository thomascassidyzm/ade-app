// VFS Agent Wrapper
// Wraps any agent to automatically send outputs to VFS

const VFSOutputHandler = require('./vfs-output-handler');

class VFSAgentWrapper {
  constructor(agentId, agentInstance = null) {
    this.agentId = agentId;
    this.agent = agentInstance;
    this.vfs = new VFSOutputHandler();
    this.interceptConsole();
    
    // Wait for VFS connection
    this.vfs.on('connected', () => {
      this.log(`Agent ${agentId} connected to VFS`);
    });
  }

  // Intercept console methods to capture all output
  interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    
    // Override console.log
    console.log = (...args) => {
      originalLog.apply(console, args);
      this.vfs.log(this.agentId, args.join(' '));
    };
    
    // Override console.error
    console.error = (...args) => {
      originalError.apply(console, args);
      this.vfs.logError(this.agentId, args.join(' '));
    };
    
    // Override console.warn
    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.vfs.log(this.agentId, `[WARN] ${args.join(' ')}`);
    };
    
    // Override console.info
    console.info = (...args) => {
      originalInfo.apply(console, args);
      this.vfs.log(this.agentId, `[INFO] ${args.join(' ')}`);
    };
  }

  // Log message to VFS
  log(message) {
    this.vfs.log(this.agentId, message);
  }

  // Log APML message
  logAPML(apmlMessage) {
    this.vfs.logAPML(this.agentId, apmlMessage);
    
    // Also create visualization data
    this.createAPMLVisualization(apmlMessage);
  }

  // Create APML visualization
  createAPMLVisualization(apmlMessage) {
    const vizData = {
      nodes: [],
      edges: [],
      message: apmlMessage
    };
    
    // Add sender node
    if (apmlMessage.from) {
      vizData.nodes.push({
        id: apmlMessage.from,
        label: apmlMessage.from,
        type: 'agent'
      });
    }
    
    // Add recipient node
    if (apmlMessage.to) {
      vizData.nodes.push({
        id: apmlMessage.to,
        label: apmlMessage.to,
        type: 'agent'
      });
    }
    
    // Add edge
    if (apmlMessage.from && apmlMessage.to) {
      vizData.edges.push({
        from: apmlMessage.from,
        to: apmlMessage.to,
        label: apmlMessage.type,
        type: apmlMessage.type
      });
    }
    
    this.vfs.createVisualization(this.agentId, 'apml-flow', vizData);
  }

  // Log generated code
  logCode(code, filename, language = 'javascript') {
    this.vfs.logCode(this.agentId, code, filename, language);
  }

  // Update agent status
  updateStatus(status, metadata = {}) {
    this.vfs.logStatus(this.agentId, status, metadata);
  }

  // Log error with stack trace
  logError(error) {
    this.vfs.logError(this.agentId, error, error.stack);
  }

  // Create app structure visualization
  createAppVisualization(appStructure) {
    const vizData = {
      type: 'app-structure',
      screens: appStructure.screens || [],
      navigation: appStructure.navigation || {},
      components: appStructure.components || [],
      timestamp: new Date().toISOString()
    };
    
    this.vfs.createVisualization(this.agentId, 'app-structure', vizData);
  }

  // Wrap async functions to capture outputs
  wrapAsync(fn) {
    return async (...args) => {
      try {
        this.updateStatus('processing', { function: fn.name });
        const result = await fn.apply(this.agent, args);
        this.updateStatus('idle');
        return result;
      } catch (error) {
        this.logError(error);
        this.updateStatus('error', { error: error.message });
        throw error;
      }
    };
  }

  // Get VFS file
  async getFile(path) {
    return this.vfs.getFile(path);
  }

  // List VFS files
  async listFiles(path) {
    return this.vfs.listFiles(path);
  }
}

// Factory function to wrap existing agents
function wrapAgentWithVFS(agentId, agentInstance) {
  return new VFSAgentWrapper(agentId, agentInstance);
}

// Example usage for L1_ORCH
class L1_ORCH_VFS extends VFSAgentWrapper {
  constructor() {
    super('L1_ORCH');
  }

  async processUserRequest(request) {
    this.log(`Processing user request: ${request}`);
    this.updateStatus('analyzing', { request });
    
    // Simulate APML generation
    const apmlMessage = {
      type: 'brief',
      from: 'L1_ORCH',
      to: 'L2_AppArchitect',
      timestamp: new Date().toISOString(),
      project: {
        name: 'User App',
        description: request
      }
    };
    
    this.logAPML(apmlMessage);
    
    // Create app structure visualization
    this.createAppVisualization({
      screens: ['LoginScreen', 'HomeScreen'],
      navigation: {
        LoginScreen: { success: 'HomeScreen' },
        HomeScreen: { logout: 'LoginScreen' }
      }
    });
    
    this.updateStatus('complete');
    return apmlMessage;
  }
}

module.exports = {
  VFSAgentWrapper,
  wrapAgentWithVFS,
  L1_ORCH_VFS
};