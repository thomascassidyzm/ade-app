/**
 * MCP Adapter for Claude Multi-Agent System
 * This adapter allows Claude agents to connect and communicate through MCP
 */

import WebSocket from 'ws';
import fetch from 'node-fetch';

export class MultiAgentMCPAdapter {
    constructor(config = {}) {
        this.serverUrl = config.serverUrl || 'http://localhost:3000';
        this.wsUrl = config.wsUrl || 'ws://localhost:3000';
        this.agentName = config.agentName || 'Claude Agent';
        this.capabilities = config.capabilities || ['general'];
        
        this.agentId = null;
        this.token = null;
        this.ws = null;
        this.messageHandlers = new Map();
        this.taskHandlers = new Map();
    }
    
    /**
     * Register this agent with the coordination server
     */
    async register() {
        const response = await fetch(`${this.serverUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: this.agentName,
                capabilities: this.capabilities,
                endpoint: 'mcp://claude-agent'
            })
        });
        
        const data = await response.json();
        this.agentId = data.agentId;
        this.token = data.token;
        
        // Connect WebSocket
        this.connectWebSocket();
        
        return data;
    }
    
    /**
     * Connect to WebSocket for real-time communication
     */
    connectWebSocket() {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.on('open', () => {
            console.log('Connected to coordination server');
            this.ws.send(JSON.stringify({
                type: 'identify',
                agentId: this.agentId
            }));
        });
        
        this.ws.on('message', (data) => {
            const message = JSON.parse(data);
            this.handleMessage(message);
        });
        
        this.ws.on('close', () => {
            console.log('Disconnected from coordination server');
            // Implement reconnection logic
            setTimeout(() => this.connectWebSocket(), 5000);
        });
    }
    
    /**
     * Send a message to another agent or broadcast
     */
    async sendMessage(to, content, type = 'text', metadata = {}) {
        const response = await fetch(`${this.serverUrl}/api/message`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({
                from: this.agentId,
                to,
                type,
                content,
                metadata
            })
        });
        
        return response.json();
    }
    
    /**
     * Share a file with other agents
     */
    async shareFile(filename, content, metadata = {}) {
        const response = await fetch(`${this.serverUrl}/api/files`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({
                agentId: this.agentId,
                filename,
                content,
                metadata
            })
        });
        
        return response.json();
    }
    
    /**
     * Create a task for coordination
     */
    async createTask(type, description, dependencies = [], priority = 'normal') {
        const response = await fetch(`${this.serverUrl}/api/tasks`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({
                agentId: this.agentId,
                type,
                description,
                dependencies,
                priority
            })
        });
        
        return response.json();
    }
    
    /**
     * Handle incoming messages
     */
    handleMessage(message) {
        switch (message.type) {
            case 'message':
                this.handleAgentMessage(message);
                break;
            case 'task-assigned':
                this.handleTaskAssignment(message);
                break;
            case 'file-created':
                this.handleFileNotification(message);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    
    /**
     * Handle messages from other agents
     */
    handleAgentMessage(message) {
        // Check if this message is for us
        if (!message.to || message.to === this.agentId) {
            const handler = this.messageHandlers.get(message.type) || 
                           this.messageHandlers.get('default');
            if (handler) {
                handler(message);
            }
        }
    }
    
    /**
     * Handle task assignments
     */
    handleTaskAssignment(task) {
        const handler = this.taskHandlers.get(task.type) || 
                       this.taskHandlers.get('default');
        if (handler) {
            handler(task);
        }
    }
    
    /**
     * Handle file notifications
     */
    handleFileNotification(file) {
        console.log('New file available:', file.filename);
        // Implement file handling logic
    }
    
    /**
     * Register a message handler
     */
    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }
    
    /**
     * Register a task handler
     */
    onTask(type, handler) {
        this.taskHandlers.set(type, handler);
    }
    
    /**
     * Update task status
     */
    updateTaskStatus(taskId, status, result = null) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'task-update',
                taskId,
                status,
                result
            }));
        }
    }
}

// Example usage for a Claude agent
export function createAgentConnection(agentName, capabilities) {
    const adapter = new MultiAgentMCPAdapter({
        agentName,
        capabilities
    });
    
    // Register message handlers
    adapter.onMessage('query', async (message) => {
        console.log('Received query:', message.content);
        // Process query and respond
        const response = await processQuery(message.content);
        adapter.sendMessage(message.from, response, 'response');
    });
    
    // Register task handlers
    adapter.onTask('code-review', async (task) => {
        console.log('Assigned code review task:', task.description);
        adapter.updateTaskStatus(task.id, 'in-progress');
        
        // Perform code review
        const result = await performCodeReview(task.description);
        
        adapter.updateTaskStatus(task.id, 'completed', result);
    });
    
    return adapter;
}

// Placeholder functions - implement based on your needs
async function processQuery(query) {
    return `Processed query: ${query}`;
}

async function performCodeReview(description) {
    return {
        issues: [],
        suggestions: ['Consider adding type annotations'],
        score: 8.5
    };
}