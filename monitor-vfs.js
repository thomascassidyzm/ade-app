/**
 * Monitor VFS in real-time
 */

const axios = require('axios');
const WebSocket = require('ws');
const APMLParser = require('./apml-parser');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

console.log('🔍 VFS Monitor Started\n');

// Check current VFS state
async function checkVFS() {
  try {
    const res = await axios.get(`${BASE_URL}/api/vfs`);
    const data = APMLParser.parse(res.data);
    
    console.log(`📊 VFS Status at ${new Date().toLocaleTimeString()}`);
    console.log(`   Total files: ${data.count || 0}`);
    
    if (data.files && data.files.length > 0) {
      console.log('\n📁 Files in VFS:');
      data.files.forEach(file => {
        console.log(`   • ${file.path} (${file.size} bytes) - Modified: ${new Date(file.modified).toLocaleTimeString()}`);
      });
    } else {
      console.log('   (No files yet)');
    }
    console.log('---\n');
  } catch (error) {
    console.error('❌ Error checking VFS:', error.message);
  }
}

// Monitor WebSocket for VFS updates
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket for monitoring\n');
});

ws.on('message', (data) => {
  try {
    const message = APMLParser.parse(data.toString());
    
    if (message.type === 'vfs_update' || message.type === 'vfs_write') {
      console.log('📝 VFS Update Detected!');
      console.log(`   Operation: ${message.operation || 'write'}`);
      console.log(`   Path: ${message.path}`);
      console.log(`   From: ${message.from}`);
      console.log(`   Time: ${new Date().toLocaleTimeString()}\n`);
      
      // Check VFS state after update
      setTimeout(checkVFS, 500);
    }
  } catch (e) {
    // Not APML or not relevant
  }
});

// Check VFS every 10 seconds
checkVFS();
setInterval(checkVFS, 10000);

console.log('Monitoring VFS... Press Ctrl+C to stop\n');