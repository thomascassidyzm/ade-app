#!/usr/bin/env node
/**
 * Test script for MCP L1_ORCH server
 */

const { spawn } = require('child_process');
const readline = require('readline');

console.log('Testing MCP L1_ORCH Server...\n');

// Start the MCP server
const mcp = spawn('node', ['mcp-l1-orch.js'], {
  env: { 
    ...process.env,
    ADE_WS_URL: 'ws://localhost:3000',
    ADE_HTTP_URL: 'http://localhost:3000'
  }
});

let testId = 1;

// Helper to send request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: testId++,
    method: method,
    params: params
  };
  console.log('>>> Sending:', JSON.stringify(request));
  mcp.stdin.write(JSON.stringify(request) + '\n');
}

// Handle responses
const rl = readline.createInterface({
  input: mcp.stdout,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('<<< Response:', JSON.stringify(response, null, 2));
  } catch (e) {
    console.log('<<< Raw output:', line);
  }
});

// Handle errors
mcp.stderr.on('data', (data) => {
  console.error('--- Debug:', data.toString());
});

// Run tests
setTimeout(() => {
  console.log('\n=== Test 1: Initialize ===');
  sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {}
  });
}, 100);

setTimeout(() => {
  console.log('\n=== Test 2: List Tools ===');
  sendRequest('tools/list');
}, 500);

setTimeout(() => {
  console.log('\n=== Test 3: Get Status ===');
  sendRequest('tools/call', {
    name: 'get_status',
    arguments: {}
  });
}, 1000);

setTimeout(() => {
  console.log('\n=== Test 4: Get Messages ===');
  sendRequest('tools/call', {
    name: 'get_messages',
    arguments: {}
  });
}, 1500);

setTimeout(() => {
  console.log('\n=== Test 5: Invalid Tool ===');
  sendRequest('tools/call', {
    name: 'invalid_tool',
    arguments: {}
  });
}, 2000);

setTimeout(() => {
  console.log('\n=== Test 6: Missing ID Request ===');
  mcp.stdin.write('{"method":"tools/list"}\n');
}, 2500);

// Clean up
setTimeout(() => {
  console.log('\n=== Tests Complete ===');
  mcp.kill();
  process.exit(0);
}, 3000);