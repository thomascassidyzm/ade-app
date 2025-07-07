// VFS Write API - Unified interface for all agents to write to VFS
const express = require('express');
const router = express.Router();

// This will be injected by the main server
let vfsHandler = null;
let messageBroker = null;

// Initialize with handlers
function initialize(vfs, broker) {
  vfsHandler = vfs;
  messageBroker = broker;
}

// Middleware to validate agent authentication
function validateAgent(req, res, next) {
  const agentId = req.headers['x-agent-id'];
  const agentToken = req.headers['x-agent-token'];
  
  if (!agentId) {
    return res.status(401).json({ error: 'Missing agent ID' });
  }
  
  // TODO: Implement proper token validation
  // For now, just check if agent is registered
  if (messageBroker && !messageBroker.agents.has(agentId)) {
    return res.status(401).json({ error: 'Agent not registered' });
  }
  
  req.agentId = agentId;
  next();
}

// Write a file to VFS
router.post('/write', validateAgent, async (req, res) => {
  try {
    const { path, content, metadata } = req.body;
    
    if (!path || content === undefined) {
      return res.status(400).json({ error: 'Path and content required' });
    }
    
    // Prefix with agent directory
    const fullPath = `agents/${req.agentId}/outputs/${path}`;
    
    // Write to VFS
    await vfsHandler.writeFile(fullPath, content, metadata);
    
    // Log the write operation
    const logEntry = {
      agentId: req.agentId,
      operation: 'write',
      path: fullPath,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    await vfsHandler.writeFile(
      `logs/vfs-operations/${new Date().toISOString().split('T')[0]}.jsonl`,
      JSON.stringify(logEntry) + '\n',
      { append: true }
    );
    
    res.json({ 
      success: true, 
      path: fullPath,
      timestamp: logEntry.timestamp
    });
  } catch (error) {
    console.error('VFS write error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Write multiple files atomically
router.post('/write-batch', validateAgent, async (req, res) => {
  try {
    const { files } = req.body;
    
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Files array required' });
    }
    
    const results = [];
    const errors = [];
    
    // Process all files
    for (const file of files) {
      try {
        const fullPath = `agents/${req.agentId}/outputs/${file.path}`;
        await vfsHandler.writeFile(fullPath, file.content, file.metadata);
        results.push({ path: fullPath, success: true });
      } catch (error) {
        errors.push({ path: file.path, error: error.message });
      }
    }
    
    res.json({ 
      success: errors.length === 0,
      written: results,
      errors: errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('VFS batch write error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a directory
router.post('/mkdir', validateAgent, async (req, res) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'Path required' });
    }
    
    const fullPath = `agents/${req.agentId}/outputs/${path}`;
    await vfsHandler.createDirectory(fullPath);
    
    res.json({ 
      success: true, 
      path: fullPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('VFS mkdir error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Write APML specification
router.post('/write-apml', validateAgent, async (req, res) => {
  try {
    const { spec, path, metadata } = req.body;
    
    if (!spec || !path) {
      return res.status(400).json({ error: 'Spec and path required' });
    }
    
    // Convert spec to APML format
    const apmlContent = `---
apml: 1.0
type: specification
agent: ${req.agentId}
created: ${new Date().toISOString()}
${metadata ? Object.entries(metadata).map(([k, v]) => `${k}: ${v}`).join('\n') : ''}
---

${JSON.stringify(spec, null, 2)}`;
    
    const fullPath = `agents/${req.agentId}/specs/${path}.apml`;
    await vfsHandler.writeFile(fullPath, apmlContent);
    
    // Notify other agents about new spec
    if (messageBroker) {
      messageBroker.sendMessage(req.agentId, 'broadcast', 'spec_created', {
        path: fullPath,
        spec: spec
      });
    }
    
    res.json({ 
      success: true, 
      path: fullPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('VFS APML write error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Write agent output with auto-categorization
router.post('/output', validateAgent, async (req, res) => {
  try {
    const { type, content, metadata } = req.body;
    
    if (!type || !content) {
      return res.status(400).json({ error: 'Type and content required' });
    }
    
    // Auto-categorize by output type
    const timestamp = new Date().toISOString();
    const filename = `${type}-${Date.now()}`;
    let path;
    
    switch (type) {
      case 'code':
        path = `agents/${req.agentId}/outputs/code/${filename}.${metadata?.language || 'txt'}`;
        break;
      case 'design':
        path = `agents/${req.agentId}/outputs/designs/${filename}.json`;
        break;
      case 'test':
        path = `agents/${req.agentId}/outputs/tests/${filename}.json`;
        break;
      case 'documentation':
        path = `agents/${req.agentId}/outputs/docs/${filename}.md`;
        break;
      case 'error':
        path = `agents/${req.agentId}/errors/${filename}.json`;
        break;
      default:
        path = `agents/${req.agentId}/outputs/misc/${filename}.json`;
    }
    
    // Wrap content with metadata
    const outputData = {
      agentId: req.agentId,
      type: type,
      timestamp: timestamp,
      metadata: metadata || {},
      content: content
    };
    
    await vfsHandler.writeFile(path, JSON.stringify(outputData, null, 2));
    
    // Emit event for real-time updates
    if (vfsHandler.emit) {
      vfsHandler.emit('agent_output', {
        agentId: req.agentId,
        type: type,
        path: path,
        timestamp: timestamp
      });
    }
    
    res.json({ 
      success: true, 
      path: path,
      timestamp: timestamp
    });
  } catch (error) {
    console.error('VFS output error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream large outputs
router.post('/stream', validateAgent, async (req, res) => {
  try {
    const { path, chunk, position, isFinal } = req.body;
    
    if (!path || chunk === undefined || position === undefined) {
      return res.status(400).json({ error: 'Path, chunk, and position required' });
    }
    
    const fullPath = `agents/${req.agentId}/outputs/${path}`;
    
    // Handle streaming write
    if (position === 0) {
      // First chunk - create file
      await vfsHandler.writeFile(fullPath, chunk);
    } else {
      // Append chunk
      await vfsHandler.appendFile(fullPath, chunk);
    }
    
    if (isFinal) {
      // Finalize the stream
      await vfsHandler.writeFile(
        `${fullPath}.meta`,
        JSON.stringify({
          agentId: req.agentId,
          completedAt: new Date().toISOString(),
          chunks: position + 1
        })
      );
    }
    
    res.json({ 
      success: true,
      position: position,
      isFinal: isFinal || false
    });
  } catch (error) {
    console.error('VFS stream error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, initialize };