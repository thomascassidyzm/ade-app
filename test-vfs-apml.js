/**
 * Test VFS with APML format
 */

const axios = require('axios');
const APMLParser = require('./apml-parser');

const BASE_URL = 'http://localhost:3000';

async function testVFS() {
  console.log('🧪 Testing VFS with APML format\n');
  
  try {
    // 1. Write to VFS
    console.log('1. Writing to VFS...');
    const writeRes = await axios.post(`${BASE_URL}/api/vfs/write`, {
      path: 'test/hello.txt',
      content: 'Hello from VFS test!',
      metadata: { 
        author: 'test-script',
        purpose: 'VFS functionality test'
      }
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const writeData = APMLParser.parse(writeRes.data);
    console.log('   ✅ Success:', writeData.success);
    console.log('   ✅ Path:', writeData.path);
    console.log('   ✅ Timestamp:', writeData.timestamp);
    
    // 2. List VFS contents
    console.log('\n2. Listing VFS contents...');
    const listRes = await axios.get(`${BASE_URL}/api/vfs`);
    const listData = APMLParser.parse(listRes.data);
    console.log('   ✅ File count:', listData.count);
    if (listData.files && listData.files.length > 0) {
      listData.files.forEach(file => {
        console.log(`   📄 ${file.path} (${file.size} bytes)`);
      });
    }
    
    // 3. Read from VFS
    console.log('\n3. Reading from VFS...');
    const readRes = await axios.get(`${BASE_URL}/api/vfs/test/hello.txt`);
    const readData = APMLParser.parse(readRes.data);
    console.log('   ✅ Content:', readData.content);
    console.log('   ✅ Metadata:', JSON.stringify(readData.metadata));
    
    console.log('\n✨ VFS is working correctly with APML format!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      try {
        const errorData = APMLParser.parse(error.response.data);
        console.error('   APML Error:', errorData.error);
      } catch (e) {
        // Not APML format
      }
    }
  }
}

testVFS();