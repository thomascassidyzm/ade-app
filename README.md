# Claude Multi-Agent Coordination System

A sophisticated coordination layer that allows multiple Claude agents to communicate, share files, and coordinate tasks through MCP (Model Context Protocol).

## Features

- **Real-time Communication**: WebSocket-based messaging between agents
- **File Sharing**: Agents can share outputs and collaborate on files
- **Task Coordination**: Distribute tasks based on agent capabilities
- **Web Dashboard**: Monitor all agent activities in real-time
- **MCP Integration**: Native support for Claude's MCP protocol

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Claude Agent 1 │     │  Claude Agent 2 │     │  Claude Agent 3 │
│   (Analyzer)    │     │  (Test Runner)  │     │ (Doc Generator) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         │        MCP Protocol   │                         │
         └───────────┬───────────┴─────────────────────────┘
                     │
              ┌──────▼──────┐
              │ Coordination│
              │   Server    │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌───▼────┐
    │Messages │ │  Files  │ │ Tasks  │
    └─────────┘ └─────────┘ └────────┘
```

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the coordination server**:
   ```bash
   npm start
   ```

3. **Open the web dashboard**:
   Navigate to `http://localhost:3000` in your browser

4. **Connect Claude agents**:
   Each Claude agent can connect using the MCP adapter:

   ```javascript
   import { MultiAgentMCPAdapter } from './mcp-adapter.js';
   
   const agent = new MultiAgentMCPAdapter({
       agentName: 'Code Analyzer',
       capabilities: ['code-review', 'security-scan']
   });
   
   await agent.register();
   ```

## Agent Communication

### Sending Messages

```javascript
// Broadcast to all agents
await agent.sendMessage(null, 'Analysis complete', 'notification');

// Direct message to specific agent
await agent.sendMessage('agent-123', 'Please review this code', 'request');

// Message with metadata
await agent.sendMessage('agent-456', results, 'analysis-results', {
    fileId: 'file-789',
    confidence: 0.95
});
```

### Handling Messages

```javascript
agent.onMessage('request', async (message) => {
    console.log('Received request:', message.content);
    // Process and respond
});

agent.onMessage('default', (message) => {
    console.log('Received message:', message);
});
```

## File Sharing

```javascript
// Share analysis results
const { fileId } = await agent.shareFile(
    'analysis-report.md',
    analysisContent,
    { type: 'markdown', public: true }
);
```

## Task Coordination

```javascript
// Create a task for another agent
const { taskId } = await agent.createTask(
    'code-review',
    'Review the authentication module',
    ['file-123', 'file-456'], // dependencies
    'high' // priority
);

// Handle assigned tasks
agent.onTask('code-review', async (task) => {
    agent.updateTaskStatus(task.id, 'in-progress');
    
    const result = await performReview(task);
    
    agent.updateTaskStatus(task.id, 'completed', result);
});
```

## Web Dashboard Features

- **Agent Registry**: See all connected agents and their status
- **Message Stream**: Real-time view of all agent communications
- **Activity Log**: Track file creations, task completions, etc.
- **Interactive Messaging**: Send messages to agents from the UI
- **File Browser**: Download files shared by agents

## MCP Integration

The system is designed to work seamlessly with Claude's MCP protocol:

1. Each agent registers with unique capabilities
2. Messages are routed based on agent availability
3. Tasks are assigned based on capability matching
4. File sharing preserves context across agents

## Security Considerations

- Agents authenticate with unique tokens
- Messages can be encrypted (implement as needed)
- File access controls (implement as needed)
- Rate limiting for API endpoints (implement as needed)

## Extending the System

### Adding New Message Types

```javascript
agent.onMessage('custom-type', (message) => {
    // Handle custom message type
});
```

### Adding New Task Types

```javascript
agent.onTask('data-processing', async (task) => {
    // Handle data processing tasks
});
```

### Custom Capabilities

Register agents with specific capabilities:

```javascript
const specialist = new MultiAgentMCPAdapter({
    agentName: 'ML Specialist',
    capabilities: ['ml-training', 'data-analysis', 'prediction']
});
```

## Deployment

For production deployment:

1. Use environment variables for configuration
2. Implement proper authentication
3. Add SSL/TLS for secure communication
4. Use a proper database instead of in-memory storage
5. Implement message persistence
6. Add monitoring and logging

## License

MIT