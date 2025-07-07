# ADE Infrastructure - Getting Started

This is the core infrastructure that enables ADE agents to communicate and collaborate. With this foundation, **ADE can now build itself** using its own agent system.

## 🚀 Quick Start

1. **Start the unified server:**
```bash
node ade-unified-server.js
```

2. **Run test agents:**
```bash
node test-unified-agent.js
```

## 🏗️ Architecture

The infrastructure provides:

### 1. **APML Message Broker** (`apml-message-broker.js`)
- Handles all agent-to-agent communication
- Routes messages based on APML protocol
- Logs all messages to VFS for debugging

### 2. **VFS Write API** (`vfs-write-api.js`)
- Unified interface for agents to write outputs
- Automatic categorization of outputs
- Real-time updates via WebSocket

### 3. **Agent Registry** (`agent-registry.js`)
- Manages agent registration and capabilities
- Discovers best agent for tasks
- Tracks agent health and status

### 4. **APML-MCP Bridge** (`apml-mcp-bridge.js`)
- Maps agent capabilities to MCP tools
- Allows Claude Desktop to invoke agents
- Handles async tool responses

### 5. **Unified Server** (`ade-unified-server.js`)
- Brings all components together
- WebSocket + HTTP API
- MCP endpoint for Claude Desktop

## 📡 API Endpoints

### Agent Registration
```http
POST /api/agents/register
{
  "agentId": "my-agent-001",
  "config": {
    "name": "My Agent",
    "capabilities": ["code_generation", "testing"],
    "description": "Does amazing things"
  }
}
```

### VFS Write
```http
POST /api/vfs/write
Headers: 
  X-Agent-Id: my-agent-001
  X-Agent-Token: <token>
Body:
{
  "path": "output/code.js",
  "content": "// generated code"
}
```

### MCP Tools
```http
POST /mcp
{
  "method": "tools/call",
  "params": {
    "name": "create_file",
    "arguments": {
      "path": "test.js",
      "content": "console.log('hello');"
    }
  }
}
```

## 🔌 WebSocket Protocol

### Agent Connection
```javascript
// 1. Connect
ws = new WebSocket('ws://localhost:3000');

// 2. Authenticate
ws.send(JSON.stringify({
  type: 'agent_connect',
  agentId: 'my-agent',
  token: 'auth-token'
}));

// 3. Send APML messages
ws.send(JSON.stringify({
  type: 'apml_message',
  to: 'other-agent',
  messageType: 'brief',
  content: {
    task: 'Generate code',
    context: { language: 'js' }
  }
}));
```

## 🤖 Creating an Agent

```javascript
const TestAgent = require('./test-unified-agent');

// Create agent
const agent = new TestAgent('my-agent-001');

// Register and connect
await agent.register();
await agent.connect();

// Send messages
agent.sendMessage('broadcast', {
  announcement: 'Agent online!'
});

// Handle incoming messages
agent.handleAPMLMessage = async (message) => {
  console.log('Received:', message);
  // Process and respond
};
```

## 🔧 Claude Desktop Configuration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "ade": {
      "command": "node",
      "args": ["ade-unified-server.js"],
      "env": {
        "PORT": "3000",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 🚀 Next Steps

Now that the infrastructure is ready, ADE can:

1. **Create specialized agents** for different tasks:
   - Code generation agents
   - UI/UX design agents
   - Testing agents
   - Documentation agents

2. **Build its own interfaces**:
   - Use agents to generate the missing web pages
   - Fix the navigation system properly
   - Complete the two-way feedback loop

3. **Self-improve**:
   - Agents can modify their own code
   - Create new agent types as needed
   - Build better tools for themselves

## 🧪 Testing

Run the test suite:
```bash
# Test infrastructure
node test-unified-agent.js

# Test specific components
node test-message-flow.js
node test-vfs.js
```

## 🎯 Current Status

✅ **Completed:**
- APML message broker for agent communication
- VFS write endpoints for agent outputs
- Agent registration with capability discovery
- APML-to-MCP tool mapping
- Unified server bringing everything together

🚧 **Next Priority:**
- Enable two-way feedback loop (User ↔ L1_ORCH)
- Connect APML Visualizer to load from VFS
- Fix navigation issues using agents

## 🎉 Ready to Build!

The infrastructure is now ready. ADE can use its own agent system to:
- Fix the navigation issues
- Complete missing features
- Build new capabilities
- **Build itself!**

Start the server and let ADE take over! 🚀