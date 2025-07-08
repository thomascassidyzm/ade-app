/**
 * Test MCP VFS tools
 */

const { spawn } = require('child_process');

// Start MCP server
const mcp = spawn('node', ['mcp-l1-orch.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let requestId = 1;

// Send request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method: method,
    params: params
  };
  
  console.log('→ Sending:', JSON.stringify(request));
  mcp.stdin.write(JSON.stringify(request) + '\n');
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('← Response:', JSON.stringify(response, null, 2));
    } catch (e) {
      // Not JSON
    }
  });
});

// Handle stderr
mcp.stderr.on('data', (data) => {
  console.log('MCP Log:', data.toString().trim());
});

// Test sequence
async function runTests() {
  console.log('🧪 Testing MCP VFS Tools\n');
  
  // 1. Initialize
  console.log('1. Initializing MCP...');
  sendRequest('initialize');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. List tools
  console.log('\n2. Listing available tools...');
  sendRequest('tools/list');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 3. Write a test file
  console.log('\n3. Writing test APML file...');
  sendRequest('tools/call', {
    name: 'write_apml_file',
    arguments: {
      path: '/test/mcp-test.apml',
      content: '---\napml: 1.0\ntype: test\n---\nmessage: MCP VFS writing works!',
      metadata: {
        phase: 'testing',
        from: 'test-script'
      }
    }
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 4. List VFS files
  console.log('\n4. Listing VFS files...');
  sendRequest('tools/call', {
    name: 'list_vfs_files',
    arguments: {}
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 5. Read the file back
  console.log('\n5. Reading file back...');
  sendRequest('tools/call', {
    name: 'read_vfs_file',
    arguments: {
      path: 'test/mcp-test.apml'
    }
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Done
  console.log('\n✅ Test complete!');
  process.exit(0);
}

// Run tests after a short delay
setTimeout(runTests, 1000);