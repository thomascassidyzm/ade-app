// Test APML Communication Between Agents
// Demonstrates how agents communicate using APML protocol

const WebSocket = require('ws');
const APMLProtocol = require('./apml-protocol');

class APMLAgent {
  constructor(id, layer, capabilities) {
    this.id = id;
    this.layer = layer;
    this.capabilities = capabilities;
    this.protocol = new APMLProtocol();
    this.ws = null;
  }

  connect(url = 'ws://localhost:3000') {
    this.ws = new WebSocket(url);
    
    this.ws.on('open', () => {
      console.log(`${this.id} connected`);
      this.register();
    });
    
    this.ws.on('message', (data) => {
      // Handle both APML and JSON for compatibility
      try {
        const message = this.protocol.parseAPML(data.toString());
        this.handleMessage(message);
      } catch {
        // Fallback to JSON
        const message = JSON.parse(data);
        this.handleMessage(message);
      }
    });
  }

  register() {
    const registerMessage = this.protocol.createRegisterMessage(
      this.id,
      this.capabilities,
      this.layer
    );
    this.ws.send(registerMessage);
  }

  handleMessage(message) {
    console.log(`\n${this.id} received ${message.type} message:`);
    console.log(message);
    
    // Handle different message types
    switch (message.type) {
      case 'brief':
        this.handleBrief(message);
        break;
      case 'handoff':
        this.handleHandoff(message);
        break;
      case 'request':
        this.handleRequest(message);
        break;
    }
  }

  handleBrief(message) {
    // L2 agents handle briefs from L1
    console.log(`Processing brief: ${message.task.description}`);
    
    // Send status update
    this.sendStatus(message.from, 'processing', {
      message: 'Analyzing requirements',
      progress: 25
    });
    
    // Simulate work
    setTimeout(() => {
      // Create handoff for L3
      if (this.layer === 'L2') {
        this.createHandoff(message);
      }
    }, 1000);
  }

  handleHandoff(message) {
    // L3 agents handle handoffs from L2
    console.log(`Processing handoff package`);
    
    // Send status update
    this.sendStatus(message.from, 'building', {
      message: 'Generating code',
      progress: 50
    });
    
    // Simulate work
    setTimeout(() => {
      this.sendResult(message.from, {
        success: true,
        summary: 'Code generation complete',
        details: {
          files: 3,
          components: 5
        }
      });
    }, 1500);
  }

  handleRequest(message) {
    // L1_ORCH handles user requests
    console.log(`Processing user request: ${message.request.text}`);
    
    // Parse request and create briefs for L2 agents
    if (message.request.text.includes('dashboard')) {
      this.sendBrief('L2_Frontend', 
        'Create dashboard with user stats and activity feed',
        {
          priority: 'high',
          details: {
            features: ['real-time updates', 'responsive design', 'dark theme']
          }
        }
      );
    }
  }

  createHandoff(briefMessage) {
    // L2 creates handoff package for L3
    const specification = {
      Dashboard: {
        layout: 'grid',
        components: [
          { type: 'Header', props: { title: 'Dashboard' } },
          { type: 'StatsCard', props: { metrics: '${userStats}' } },
          { type: 'ActivityFeed', props: { items: '${activities}' } }
        ]
      }
    };
    
    const handoff = this.protocol.createHandoffMessage(
      this.id,
      'L3_React',
      specification
    );
    
    this.ws.send(handoff);
  }

  sendBrief(to, task, context) {
    const brief = this.protocol.createBriefMessage(this.id, to, task, context);
    this.ws.send(brief);
  }

  sendStatus(to, status, details) {
    const statusMessage = this.protocol.createStatusMessage(this.id, to, status, details);
    this.ws.send(statusMessage);
  }

  sendResult(to, result, artifacts = []) {
    const resultMessage = this.protocol.createResultMessage(this.id, to, result, artifacts);
    this.ws.send(resultMessage);
  }
}

// Simulate multi-agent system
async function testAPMLCommunication() {
  console.log('Starting APML Communication Test\n');
  console.log('=================================\n');
  
  // Create agents
  const l1Orch = new APMLAgent('L1_ORCH', 'L1', ['orchestration', 'planning']);
  const l2Frontend = new APMLAgent('L2_Frontend', 'L2', ['UI', 'components', 'state']);
  const l3React = new APMLAgent('L3_React', 'L3', ['react', 'jsx', 'styling']);
  
  // Connect agents
  l1Orch.connect();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  l2Frontend.connect();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  l3React.connect();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate user request
  setTimeout(() => {
    console.log('\nSimulating user request...\n');
    const userRequest = new APMLProtocol().createUserRequestMessage(
      'user123',
      'Build a dashboard with user stats',
      { intent: 'create_ui' }
    );
    l1Orch.ws.send(userRequest);
  }, 500);
}

// Example APML messages that would be sent:
console.log('\nExample APML Messages:\n');
console.log('======================\n');

const protocol = new APMLProtocol();

// 1. Agent Registration
console.log('1. Agent Registration:');
console.log(protocol.createRegisterMessage('L2_Frontend', ['UI', 'components'], 'L2'));
console.log('\n');

// 2. Task Brief
console.log('2. Task Brief (L1 → L2):');
console.log(protocol.createBriefMessage(
  'L1_ORCH',
  'L2_Frontend',
  'Create user dashboard',
  {
    priority: 'high',
    details: { theme: 'dark', responsive: true }
  }
));
console.log('\n');

// 3. Task Handoff
console.log('3. Task Handoff (L2 → L3):');
console.log(protocol.createHandoffMessage(
  'L2_Frontend',
  'L3_React',
  {
    Dashboard: {
      components: [
        { type: 'Header', props: { title: 'Dashboard' } }
      ]
    }
  }
));

// Run test if called directly
if (require.main === module) {
  testAPMLCommunication().catch(console.error);
}