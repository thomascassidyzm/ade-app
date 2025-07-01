// Test agent to demonstrate WebSocket connection and registration
const WebSocket = require('ws');

// Connect to your live ADE system
const ws = new WebSocket('wss://ade-app.up.railway.app');

console.log('Connecting to ADE WebSocket Hub...');

ws.on('open', () => {
  console.log('Connected! Registering as test agent...');
  
  // Register as a test agent
  ws.send(JSON.stringify({
    type: 'register_agent',
    agentId: 'test-agent-' + Date.now(),
    capabilities: ['testing', 'demo']
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
  
  if (message.type === 'registered') {
    console.log('✅ Successfully registered!');
    console.log('Check the ADE home page - agent count should now show 1');
  }
  
  if (message.type === 'agent_list') {
    console.log('Current agents online:', message.agents);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from ADE Hub');
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nDisconnecting...');
  ws.close();
  process.exit();
});