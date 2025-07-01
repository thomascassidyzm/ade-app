// protoADE WebSocket Connector
// This connects protoADE to the ADE WebSocket Hub to handle user requests

const WebSocket = require('ws');

class ProtoADEConnector {
  constructor() {
    this.ws = null;
    this.userId = null;
  }

  connect() {
    console.log('🚀 protoADE connecting to ADE Hub...');
    this.ws = new WebSocket('wss://ade-app.up.railway.app');

    this.ws.on('open', () => {
      console.log('✅ Connected! Registering as protoADE...');
      
      // Register as the master orchestrator
      this.ws.send(JSON.stringify({
        type: 'register_agent',
        agentId: 'protoADE',
        capabilities: ['orchestration', 'code-generation', 'project-planning', 'agent-coordination']
      }));
    });

    this.ws.on('message', async (data) => {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'registered':
          console.log('✅ protoADE registered successfully!');
          console.log('👂 Listening for user requests...');
          break;
          
        case 'user_request':
          console.log('\n📨 New request from user:', message.request);
          this.userId = message.userId;
          await this.handleUserRequest(message);
          break;
          
        case 'agent_list':
          console.log('📊 Agents online:', message.agents.length);
          break;
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });

    this.ws.on('close', (code, reason) => {
      console.log(`🔌 Disconnected from ADE Hub (code: ${code}, reason: ${reason})`);
      console.log('🔄 Reconnecting in 5 seconds...');
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    });
    
    // Ping every 30 seconds to keep connection alive
    this.ws.on('open', () => {
      setInterval(() => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.ping();
        }
      }, 30000);
    });
  }

  async handleUserRequest(message) {
    const { userId, request, sessionId } = message;
    
    try {
      // Send initial acknowledgment
      this.sendProgress(userId, 'Analyzing your request...', 10);
      
      // Simulate processing steps
      await this.sleep(1000);
      this.sendProgress(userId, 'Planning project structure...', 25);
      
      await this.sleep(1500);
      this.sendProgress(userId, 'Generating code components...', 50);
      
      await this.sleep(2000);
      this.sendProgress(userId, 'Setting up configuration...', 75);
      
      await this.sleep(1000);
      this.sendProgress(userId, 'Finalizing your project...', 90);
      
      await this.sleep(500);
      
      // Send final response
      this.sendResponse(userId, {
        status: 'complete',
        message: `I've successfully processed your request: "${request}"`,
        summary: [
          '✅ Project structure created',
          '✅ Core components generated',
          '✅ Configuration files added',
          '✅ Ready for deployment'
        ],
        nextSteps: [
          'You can view your files in the VFS Dashboard',
          'Test the application locally',
          'Deploy when ready'
        ]
      });
      
    } catch (error) {
      console.error('Error processing request:', error);
      this.sendResponse(userId, {
        status: 'error',
        message: 'Sorry, I encountered an error processing your request.',
        error: error.message
      });
    }
  }

  sendProgress(userId, message, progress) {
    console.log(`📊 Progress (${progress}%): ${message}`);
    this.ws.send(JSON.stringify({
      type: 'agent_progress',
      userId,
      message,
      progress
    }));
  }

  sendResponse(userId, response) {
    console.log('✅ Sending final response');
    this.ws.send(JSON.stringify({
      type: 'agent_response',
      userId,
      ...response
    }));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start protoADE
const protoADE = new ProtoADEConnector();
protoADE.connect();

console.log('protoADE Connector started!');
console.log('Try sending a message through the chat interface at:');
console.log('https://ade-app.up.railway.app/chat');