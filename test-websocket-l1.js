/**
 * Test WebSocket connection for L1_ORCH
 */

const WebSocket = require('ws');
const APMLParser = require('./apml-parser');

const WS_URL = 'ws://localhost:3000';

async function testWebSocket() {
  console.log('🧪 Testing L1_ORCH WebSocket Connection\n');
  
  const ws = new WebSocket(WS_URL);
  
  ws.on('open', () => {
    console.log('✅ Connected to WebSocket server');
    
    // Send L1_ORCH registration
    const registration = {
      type: 'register',
      agent: {
        id: 'L1_ORCH',
        name: 'Master Orchestrator',
        role: 'orchestrator',
        capabilities: ['specification', 'coordination', 'visualization']
      }
    };
    
    console.log('\n📤 Sending L1_ORCH registration...');
    ws.send(JSON.stringify(registration));
    
    // Test sending a message after registration
    setTimeout(() => {
      const testMessage = {
        type: 'message',
        from: 'L1_ORCH',
        to: 'user',
        content: {
          message: 'L1_ORCH connection test successful!',
          phase: 'testing'
        }
      };
      
      console.log('\n📤 Sending test message...');
      ws.send(JSON.stringify(testMessage));
    }, 1000);
    
    // Close after 3 seconds
    setTimeout(() => {
      console.log('\n👋 Closing connection...');
      ws.close();
    }, 3000);
  });
  
  ws.on('message', (data) => {
    console.log('\n📥 Received message:');
    try {
      const message = JSON.parse(data.toString());
      console.log('   Type:', message.type);
      
      if (message.type === 'welcome') {
        console.log('   ✅ Welcome message received');
        console.log('   Connected agents:', message.agents);
      } else if (message.type === 'guidance_system' || message.type === 'library_system' || message.type === 'capability_library') {
        console.log('   ✅ Received:', message.type);
        console.log('   Version:', message.version);
      } else {
        console.log('   Content:', JSON.stringify(message, null, 2));
      }
    } catch (e) {
      // Try parsing as APML
      try {
        const apmlMessage = APMLParser.parse(data.toString());
        console.log('   APML Type:', apmlMessage.type);
        console.log('   APML Content:', JSON.stringify(apmlMessage, null, 2));
      } catch (e2) {
        console.log('   Raw:', data.toString());
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
  
  ws.on('close', () => {
    console.log('\n✅ WebSocket connection closed');
  });
}

testWebSocket();