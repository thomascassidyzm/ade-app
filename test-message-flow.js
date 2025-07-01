// Test message flow from user to protoADE
const WebSocket = require('ws');

console.log('Testing ADE message flow...');

// Connect as a user
const userWs = new WebSocket('wss://ade-app.up.railway.app');

userWs.on('open', () => {
  console.log('✅ Connected as user');
  
  // Send a test message
  setTimeout(() => {
    console.log('📤 Sending test message...');
    userWs.send(JSON.stringify({
      type: 'user_request',
      userId: 'test-user-123',
      request: 'Build me a simple counter app',
      sessionId: 'test-session'
    }));
  }, 1000);
});

userWs.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('📥 User received:', message);
  
  if (message.type === 'agent_progress') {
    console.log(`⏳ Progress: ${message.message}`);
  }
  
  if (message.type === 'agent_response') {
    console.log('✅ Got response from protoADE!');
    console.log('Response:', message.message);
    process.exit(0);
  }
});

userWs.on('error', (error) => {
  console.error('❌ Error:', error);
});

// Keep alive for 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - no response received');
  process.exit(1);
}, 30000);