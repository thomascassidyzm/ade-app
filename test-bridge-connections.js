#!/usr/bin/env node

/**
 * Test script for L1_ORCH bridge and WebSocket connections
 */

const WebSocket = require('ws');
const http = require('http');
const { spawn } = require('child_process');

// Test configuration
const LOCAL_WS_PORT = 8765;
const STATUS_PORT = 8766;
const REMOTE_ADE = 'wss://ade-app.up.railway.app';

let bridgeProcess = null;

async function startBridge() {
  console.log('🚀 Starting L1_ORCH bridge...');
  bridgeProcess = spawn('node', ['l1-orch-bridge.js'], {
    stdio: 'pipe'
  });

  bridgeProcess.stdout.on('data', (data) => {
    console.log(`[BRIDGE] ${data.toString().trim()}`);
  });

  bridgeProcess.stderr.on('data', (data) => {
    console.error(`[BRIDGE ERROR] ${data.toString().trim()}`);
  });

  bridgeProcess.on('error', (error) => {
    console.error('❌ Failed to start bridge:', error.message);
  });

  // Wait for bridge to start
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testHTTPStatus() {
  console.log('\n📊 Testing HTTP status endpoint...');
  
  return new Promise((resolve) => {
    http.get(`http://localhost:${STATUS_PORT}/status`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          console.log('✅ HTTP Status endpoint working:');
          console.log('   Bridge:', status.bridge);
          console.log('   Remote connected:', status.remote_connected);
          console.log('   Local clients:', status.local_clients);
          console.log('   Timestamp:', status.timestamp);
          resolve(true);
        } catch (e) {
          console.error('❌ Failed to parse status response:', e.message);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error('❌ HTTP Status endpoint failed:', err.message);
      resolve(false);
    });
  });
}

async function testLocalWebSocket() {
  console.log('\n🔌 Testing local WebSocket server...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${LOCAL_WS_PORT}`);
    
    ws.on('open', () => {
      console.log('✅ Connected to local WebSocket server');
      
      // Send test message
      ws.send(JSON.stringify({
        type: 'test',
        from: 'test-script',
        timestamp: new Date().toISOString()
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('✅ Received message:', msg.type);
        if (msg.type === 'bridge_status') {
          console.log('   Connected to remote:', msg.connected_to_remote);
        }
      } catch (e) {
        console.log('📨 Raw message:', data.toString().substring(0, 100));
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ Local WebSocket error:', error.message);
      resolve(false);
    });
    
    ws.on('close', () => {
      console.log('🔒 Local WebSocket connection closed');
      resolve(true);
    });
    
    // Close after 3 seconds
    setTimeout(() => {
      ws.close();
    }, 3000);
  });
}

async function testRemoteConnection() {
  console.log('\n🌐 Testing direct connection to remote ADE...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(REMOTE_ADE);
    
    ws.on('open', () => {
      console.log('✅ Connected directly to remote ADE');
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error) => {
      console.error('❌ Remote connection error:', error.message);
      resolve(false);
    });
    
    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.error('❌ Remote connection timeout');
        ws.close();
        resolve(false);
      }
    }, 10000);
  });
}

async function checkBridgeLogs() {
  console.log('\n📋 Checking bridge logs...');
  
  // Wait a bit for logs to accumulate
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // The logs are already being printed by the stdout handler
  console.log('✅ Bridge logs captured above');
}

async function runTests() {
  console.log('🔧 L1_ORCH Bridge Connection Test Suite\n');
  
  try {
    // Start the bridge
    await startBridge();
    
    // Run all tests
    const httpStatus = await testHTTPStatus();
    const localWs = await testLocalWebSocket();
    const remoteWs = await testRemoteConnection();
    await checkBridgeLogs();
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('─────────────────────────────────');
    console.log(`HTTP Status Endpoint: ${httpStatus ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Local WebSocket Server: ${localWs ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Remote ADE Connection: ${remoteWs ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Bridge Process: ${bridgeProcess && !bridgeProcess.killed ? '✅ RUNNING' : '❌ NOT RUNNING'}`);
    console.log('─────────────────────────────────');
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
  } finally {
    // Cleanup
    if (bridgeProcess) {
      console.log('\n🔨 Stopping bridge...');
      bridgeProcess.kill();
    }
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

// Run the test suite
runTests();