/**
 * Multi-Agent Coordination Server
 * Handles communication between multiple Claude agents via MCP
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// In-memory storage (could be replaced with a database)
const agents = new Map();
const messages = [];
const files = new Map();
const tasks = new Map();

// Agent registration endpoint
app.post('/api/register', (req, res) => {
    const { name, capabilities, endpoint } = req.body;
    const agentId = `agent-${crypto.randomBytes(8).toString('hex')}`;
    
    const agent = {
        id: agentId,
        name,
        capabilities: capabilities || [],
        endpoint,
        status: 'active',
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
    };
    
    agents.set(agentId, agent);
    
    // Broadcast new agent to all connected clients
    io.emit('agent-joined', agent);
    
    res.json({ 
        agentId, 
        token: crypto.randomBytes(32).toString('hex') 
    });
});

// Message relay endpoint
app.post('/api/message', (req, res) => {
    const { from, to, type, content, metadata } = req.body;
    
    const message = {
        id: crypto.randomBytes(16).toString('hex'),
        from,
        to,
        type: type || 'text',
        content,
        metadata,
        timestamp: new Date().toISOString()
    };
    
    messages.push(message);
    
    // Broadcast message
    io.emit('message', message);
    
    // If it's a direct message, also send via MCP if available
    if (to && agents.has(to)) {
        const targetAgent = agents.get(to);
        // Here you would implement MCP communication
        console.log(`Routing message to ${targetAgent.name} via MCP`);
    }
    
    res.json({ messageId: message.id });
});

// File sharing endpoint
app.post('/api/files', async (req, res) => {
    const { agentId, filename, content, metadata } = req.body;
    
    const fileId = crypto.randomBytes(16).toString('hex');
    const file = {
        id: fileId,
        filename,
        agentId,
        content,
        metadata,
        createdAt: new Date().toISOString(),
        version: 1
    };
    
    files.set(fileId, file);
    
    // Save to disk
    const filePath = join(__dirname, 'files', fileId);
    await fs.mkdir(join(__dirname, 'files'), { recursive: true });
    await fs.writeFile(filePath, content);
    
    // Broadcast file creation
    io.emit('file-created', {
        id: fileId,
        filename,
        agentId,
        metadata
    });
    
    res.json({ fileId });
});

// Task coordination endpoint
app.post('/api/tasks', (req, res) => {
    const { agentId, type, description, dependencies, priority } = req.body;
    
    const taskId = crypto.randomBytes(16).toString('hex');
    const task = {
        id: taskId,
        agentId,
        type,
        description,
        dependencies: dependencies || [],
        priority: priority || 'normal',
        status: 'pending',
        createdAt: new Date().toISOString(),
        assignedTo: null,
        result: null
    };
    
    tasks.set(taskId, task);
    
    // Find available agent with required capabilities
    const availableAgent = findAvailableAgent(type);
    if (availableAgent) {
        task.assignedTo = availableAgent.id;
        task.status = 'assigned';
        
        // Notify agent via WebSocket
        io.to(availableAgent.socketId).emit('task-assigned', task);
    }
    
    res.json({ taskId });
});

// WebSocket handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send current state
    socket.emit('initial-state', {
        agents: Array.from(agents.values()),
        recentMessages: messages.slice(-50),
        files: Array.from(files.values()).map(f => ({
            id: f.id,
            filename: f.filename,
            agentId: f.agentId,
            createdAt: f.createdAt
        }))
    });
    
    // Handle agent identification
    socket.on('identify', (agentId) => {
        const agent = agents.get(agentId);
        if (agent) {
            agent.socketId = socket.id;
            agent.status = 'active';
            agent.lastSeen = new Date().toISOString();
            
            socket.join(`agent-${agentId}`);
            io.emit('agent-status-changed', { agentId, status: 'active' });
        }
    });
    
    // Handle messages
    socket.on('message', (message) => {
        messages.push(message);
        socket.broadcast.emit('message', message);
    });
    
    // Handle task updates
    socket.on('task-update', ({ taskId, status, result }) => {
        const task = tasks.get(taskId);
        if (task) {
            task.status = status;
            if (result) task.result = result;
            
            io.emit('task-updated', { taskId, status, result });
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        // Find agent by socket ID and update status
        for (const [agentId, agent] of agents.entries()) {
            if (agent.socketId === socket.id) {
                agent.status = 'offline';
                agent.lastSeen = new Date().toISOString();
                io.emit('agent-status-changed', { agentId, status: 'offline' });
                break;
            }
        }
    });
});

// Helper functions
function findAvailableAgent(taskType) {
    for (const agent of agents.values()) {
        if (agent.status === 'active' && 
            agent.capabilities.includes(taskType)) {
            return agent;
        }
    }
    return null;
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Multi-Agent Coordination Server running on port ${PORT}`);
});