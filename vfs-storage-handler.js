// VFS Storage Handler
// Manages actual file storage for the VFS with WebSocket updates

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class VFSStorageHandler extends EventEmitter {
  constructor(basePath = './vfs-storage') {
    super();
    this.basePath = basePath;
    this.initialize();
  }

  async initialize() {
    // Create base directory if it doesn't exist
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'agents'), { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'visualizations'), { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'projects'), { recursive: true });
      console.log('VFS Storage initialized at:', this.basePath);
    } catch (error) {
      console.error('Failed to initialize VFS storage:', error);
    }
  }

  // Handle VFS operations from WebSocket
  async handleVFSOperation(operation) {
    const { type, path: filePath, content, metadata } = operation;
    
    try {
      let result;
      
      switch (type) {
        case 'write':
          result = await this.writeFile(filePath, content, metadata);
          break;
        case 'read':
          result = await this.readFile(filePath);
          break;
        case 'list':
          result = await this.listDirectory(filePath);
          break;
        case 'delete':
          result = await this.deleteFile(filePath);
          break;
        case 'mkdir':
          result = await this.createDirectory(filePath);
          break;
        default:
          throw new Error(`Unknown VFS operation: ${type}`);
      }
      
      // Emit event for WebSocket broadcast
      this.emit('vfs_update', {
        operation: type,
        path: filePath,
        result,
        metadata,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      console.error('VFS operation error:', error);
      this.emit('vfs_error', {
        operation: type,
        path: filePath,
        error: error.message
      });
      throw error;
    }
  }

  // Write file
  async writeFile(filePath, content, metadata = {}) {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });
    
    // Handle append mode for logs
    if (metadata.append && await this.fileExists(fullPath)) {
      await fs.appendFile(fullPath, content);
    } else {
      await fs.writeFile(fullPath, content, 'utf8');
    }
    
    // Store metadata
    const metaPath = fullPath + '.meta.json';
    await fs.writeFile(metaPath, JSON.stringify({
      ...metadata,
      lastModified: new Date().toISOString(),
      size: Buffer.byteLength(content, 'utf8')
    }, null, 2));
    
    return { success: true, path: filePath };
  }

  // Read file
  async readFile(filePath) {
    const fullPath = path.join(this.basePath, filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    
    // Try to read metadata
    let metadata = {};
    try {
      const metaPath = fullPath + '.meta.json';
      metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'));
    } catch (e) {
      // No metadata file
    }
    
    return { content, metadata };
  }

  // List directory
  async listDirectory(dirPath) {
    const fullPath = path.join(this.basePath, dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    const files = [];
    const directories = [];
    
    for (const entry of entries) {
      // Skip metadata files
      if (entry.name.endsWith('.meta.json')) continue;
      
      const entryPath = path.join(dirPath, entry.name);
      const stats = await fs.stat(path.join(fullPath, entry.name));
      
      if (entry.isDirectory()) {
        directories.push({
          name: entry.name,
          path: entryPath,
          modified: stats.mtime,
          size: stats.size
        });
      } else {
        // Try to get metadata
        let metadata = {};
        try {
          const metaPath = path.join(fullPath, entry.name + '.meta.json');
          metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'));
        } catch (e) {
          // No metadata
        }
        
        files.push({
          name: entry.name,
          path: entryPath,
          modified: stats.mtime,
          size: stats.size,
          metadata
        });
      }
    }
    
    return { files, directories };
  }

  // Delete file
  async deleteFile(filePath) {
    const fullPath = path.join(this.basePath, filePath);
    await fs.unlink(fullPath);
    
    // Also delete metadata
    try {
      await fs.unlink(fullPath + '.meta.json');
    } catch (e) {
      // No metadata file
    }
    
    return { success: true };
  }

  // Create directory
  async createDirectory(dirPath) {
    const fullPath = path.join(this.basePath, dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true };
  }

  // Check if file exists
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Get agent output directory
  getAgentOutputPath(agentId, outputType) {
    const timestamp = new Date().toISOString().split('T')[0];
    return path.join('agents', agentId, outputType, timestamp);
  }

  // Special method for agent outputs
  async storeAgentOutput(agentId, outputType, content, filename = null) {
    const dir = this.getAgentOutputPath(agentId, outputType);
    const file = filename || `${outputType}-${Date.now()}.json`;
    const filePath = path.join(dir, file);
    
    await this.writeFile(filePath, content, {
      agentId,
      outputType,
      timestamp: new Date().toISOString()
    });
    
    return filePath;
  }

  // Get recent agent outputs
  async getRecentAgentOutputs(agentId, outputType = null, limit = 10) {
    const agentPath = path.join('agents', agentId);
    const outputs = [];
    
    try {
      if (outputType) {
        // Get specific type
        const typePath = path.join(agentPath, outputType);
        const result = await this.listDirectory(typePath);
        outputs.push(...result.files);
      } else {
        // Get all types
        const types = await this.listDirectory(agentPath);
        for (const typeDir of types.directories) {
          const result = await this.listDirectory(typeDir.path);
          outputs.push(...result.files);
        }
      }
      
      // Sort by modified time and limit
      outputs.sort((a, b) => b.modified - a.modified);
      return outputs.slice(0, limit);
    } catch (error) {
      return [];
    }
  }
}

module.exports = VFSStorageHandler;