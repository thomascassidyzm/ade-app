/**
 * Test the clean ADE build
 */

const axios = require('axios');

const BASE_URL = process.env.ADE_URL || 'http://localhost:3000';

async function test() {
  console.log('🧪 Testing ADE Clean Build\n');
  console.log(`Server: ${BASE_URL}\n`);
  
  const tests = [
    // Health check
    async () => {
      console.log('1. Health Check');
      const res = await axios.get(`${BASE_URL}/api/health`);
      console.log('   ✅ Status:', res.data.status);
      console.log('   ✅ Server:', res.data.server);
      console.log('   ✅ Version:', res.data.version);
    },
    
    // Register an agent
    async () => {
      console.log('\n2. Register Agent');
      const res = await axios.post(`${BASE_URL}/api/agents/register`, {
        id: 'test-agent-001',
        name: 'Test Agent',
        capabilities: ['testing', 'development']
      });
      console.log('   ✅ Success:', res.data.success);
      console.log('   ✅ Agent ID:', res.data.agent.id);
    },
    
    // List agents
    async () => {
      console.log('\n3. List Agents');
      const res = await axios.get(`${BASE_URL}/api/agents`);
      console.log('   ✅ Agent count:', res.data.count);
      console.log('   ✅ Agents:', res.data.agents.map(a => a.name).join(', '));
    },
    
    // Write to VFS
    async () => {
      console.log('\n4. Write to VFS');
      const res = await axios.post(`${BASE_URL}/api/vfs/write`, {
        path: 'test/hello.txt',
        content: 'Hello from clean ADE!'
      });
      console.log('   ✅ Success:', res.data.success);
      console.log('   ✅ Path:', res.data.path);
    },
    
    // Read from VFS
    async () => {
      console.log('\n5. Read from VFS');
      const res = await axios.get(`${BASE_URL}/api/vfs/read/test/hello.txt`);
      console.log('   ✅ Content:', res.data.content);
      console.log('   ✅ Updated:', new Date(res.data.updatedAt).toLocaleString());
    },
    
    // Test MCP endpoint
    async () => {
      console.log('\n6. Test MCP Endpoint');
      const res = await axios.post(`${BASE_URL}/api/mcp`, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize'
      });
      console.log('   ✅ Protocol:', res.data.result.protocolVersion);
      console.log('   ✅ Server:', res.data.result.serverInfo.name);
    },
    
    // List MCP tools
    async () => {
      console.log('\n7. List MCP Tools');
      const res = await axios.post(`${BASE_URL}/api/mcp`, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      });
      console.log('   ✅ Tools:', res.data.result.tools.map(t => t.name).join(', '));
    }
  ];
  
  // Run all tests
  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      console.error('   ❌ Error:', error.response?.data || error.message);
    }
  }
  
  console.log('\n✨ All tests complete!\n');
}

// Run tests
test().catch(console.error);