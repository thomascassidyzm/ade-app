// Test script to verify ADE unified server endpoints
const axios = require('axios');

// Configure the server URL (update this after deployment)
const SERVER_URL = process.env.ADE_SERVER_URL || 'http://localhost:3000';
const PRODUCTION_URL = 'https://ade-app.up.railway.app';

async function testEndpoints(baseUrl) {
  console.log(`\n🧪 Testing ADE Unified Server at: ${baseUrl}\n`);
  
  const tests = [
    {
      name: 'Health Check',
      method: 'GET',
      url: '/health',
      expectedStatus: 200,
      validate: (data) => data.status === 'ok'
    },
    {
      name: 'MCP Initialize',
      method: 'POST',
      url: '/mcp',
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      },
      expectedStatus: 200,
      validate: (data) => data.result && data.result.protocolVersion
    },
    {
      name: 'MCP Tools List',
      method: 'POST',
      url: '/mcp',
      data: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      },
      expectedStatus: 200,
      validate: (data) => data.result && data.result.tools
    },
    {
      name: 'Agent Registration',
      method: 'POST',
      url: '/api/agents/register',
      data: {
        agentId: 'test-agent-' + Date.now(),
        config: {
          name: 'Test Agent',
          capabilities: ['testing'],
          description: 'Endpoint test agent'
        }
      },
      expectedStatus: 200,
      validate: (data) => data.success && data.token
    },
    {
      name: 'List Agents',
      method: 'GET',
      url: '/api/agents',
      expectedStatus: 200,
      validate: (data) => data.agents && data.capabilities
    },
    {
      name: 'Home Page',
      method: 'GET',
      url: '/',
      expectedStatus: 200,
      validateText: true
    },
    {
      name: 'Chat Interface',
      method: 'GET',
      url: '/chat',
      expectedStatus: 200,
      validateText: true
    },
    {
      name: 'Dashboard',
      method: 'GET',
      url: '/dashboard',
      expectedStatus: 200,
      validateText: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n📋 Testing: ${test.name}`);
      console.log(`   ${test.method} ${test.url}`);
      
      const config = {
        method: test.method,
        url: baseUrl + test.url,
        data: test.data,
        headers: test.headers || {}
      };
      
      const response = await axios(config);
      
      if (response.status !== test.expectedStatus) {
        throw new Error(`Expected status ${test.expectedStatus}, got ${response.status}`);
      }
      
      if (test.validate && !test.validate(response.data)) {
        throw new Error('Response validation failed');
      }
      
      if (test.validateText && typeof response.data !== 'string') {
        throw new Error('Expected HTML response');
      }
      
      console.log(`   ✅ PASSED`);
      if (test.validate || test.validateText) {
        console.log(`   Response valid`);
      }
      passed++;
      
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data:`, error.response.data);
      }
      failed++;
    }
  }
  
  console.log(`\n📊 Results for ${baseUrl}:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${tests.length}`);
  
  return { passed, failed, total: tests.length };
}

async function testWebSocket(baseUrl) {
  console.log(`\n🔌 Testing WebSocket connection...`);
  
  const WebSocket = require('ws');
  const wsUrl = baseUrl.replace('http', 'ws').replace('https', 'wss');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('   ✅ WebSocket connected');
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error) => {
      console.log(`   ❌ WebSocket error: ${error.message}`);
      resolve(false);
    });
    
    setTimeout(() => {
      console.log('   ❌ WebSocket timeout');
      ws.close();
      resolve(false);
    }, 5000);
  });
}

async function runTests() {
  console.log('🚀 ADE Unified Server Endpoint Tests\n');
  
  // Test local if available
  if (SERVER_URL.includes('localhost')) {
    console.log('Testing local server...');
    try {
      await axios.get(SERVER_URL + '/health', { timeout: 2000 });
      await testEndpoints(SERVER_URL);
      await testWebSocket(SERVER_URL);
    } catch (error) {
      console.log('\n⚠️  Local server not running\n');
    }
  }
  
  // Test production
  console.log('\nTesting production server...');
  try {
    const results = await testEndpoints(PRODUCTION_URL);
    const wsOk = await testWebSocket(PRODUCTION_URL);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 DEPLOYMENT VERIFICATION COMPLETE');
    console.log('='.repeat(50));
    
    if (results.failed === 0 && wsOk) {
      console.log('\n✅ All tests passed! Server is ready for use.');
      console.log(`\n📡 MCP Endpoint: ${PRODUCTION_URL}/mcp`);
      console.log(`🔧 Configure Claude Desktop with this URL`);
    } else {
      console.log('\n⚠️  Some tests failed. Check the logs above.');
    }
    
  } catch (error) {
    console.log('\n❌ Could not connect to production server');
    console.log('   Make sure it has been deployed to Railway');
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoints, testWebSocket };