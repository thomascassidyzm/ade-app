// Test VFS API
// Run with: node test-vfs.js

const API_URL = 'https://apml-development-engine-6uytvnqdb-zenjin.vercel.app/api';

async function testVFS() {
    console.log('Testing VFS API...\n');
    
    // Test 1: Write a file
    console.log('1. Writing test file...');
    try {
        const writeResponse = await fetch(`${API_URL}/vfs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'write',
                path: '/test/hello.js',
                content: 'console.log("Hello from VFS!");',
                agentId: 'test-agent',
                projectId: 'default'
            })
        });
        const writeResult = await writeResponse.json();
        console.log('Write result:', writeResult);
    } catch (error) {
        console.error('Write failed:', error.message);
    }
    
    // Test 2: Read the file
    console.log('\n2. Reading test file...');
    try {
        const readResponse = await fetch(`${API_URL}/vfs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'read',
                path: '/test/hello.js',
                projectId: 'default'
            })
        });
        const readResult = await readResponse.json();
        console.log('Read result:', readResult);
    } catch (error) {
        console.error('Read failed:', error.message);
    }
    
    // Test 3: List directory
    console.log('\n3. Listing directory...');
    try {
        const listResponse = await fetch(`${API_URL}/vfs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'list',
                path: '/test',
                projectId: 'default'
            })
        });
        const listResult = await listResponse.json();
        console.log('List result:', listResult);
    } catch (error) {
        console.error('List failed:', error.message);
    }
    
    // Test 4: Create directory
    console.log('\n4. Creating directory...');
    try {
        const mkdirResponse = await fetch(`${API_URL}/vfs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'mkdir',
                path: '/test/components',
                agentId: 'test-agent',
                projectId: 'default'
            })
        });
        const mkdirResult = await mkdirResponse.json();
        console.log('Mkdir result:', mkdirResult);
    } catch (error) {
        console.error('Mkdir failed:', error.message);
    }
    
    // Test 5: Write another file
    console.log('\n5. Writing component file...');
    try {
        const componentCode = `<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  }
}
</script>`;
        
        const writeResponse = await fetch(`${API_URL}/vfs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'write',
                path: '/test/components/HelloWorld.vue',
                content: componentCode,
                agentId: 'test-agent',
                projectId: 'default'
            })
        });
        const writeResult = await writeResponse.json();
        console.log('Component write result:', writeResult);
    } catch (error) {
        console.error('Component write failed:', error.message);
    }
    
    console.log('\n✅ VFS tests complete!');
}

// Run tests
testVFS();