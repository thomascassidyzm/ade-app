/**
 * Vercel Serverless Function: Virtual File System Operations
 * POST /api/vfs - Execute VFS operations
 * GET /api/vfs - Get file or directory listing
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// VFS operations mapping
const VFS_OPERATIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  MKDIR: 'mkdir',
  LIST: 'list',
  MOVE: 'move',
  COPY: 'copy',
  EXISTS: 'exists'
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'POST') {
    // Execute VFS operation
    try {
      const { operation, path, content, targetPath, agentId, projectId } = req.body;
      
      if (!operation || !path) {
        return res.status(400).json({ error: 'Missing required fields: operation, path' });
      }
      
      // Ensure projectId for isolation
      const project = projectId || 'default';
      const vfsPath = `vfs/${project}${path}`;
      
      let result;
      
      switch (operation) {
        case VFS_OPERATIONS.WRITE:
          result = await writeFile(vfsPath, content, agentId);
          break;
          
        case VFS_OPERATIONS.READ:
          result = await readFile(vfsPath);
          break;
          
        case VFS_OPERATIONS.DELETE:
          result = await deleteFile(vfsPath, agentId);
          break;
          
        case VFS_OPERATIONS.LIST:
          result = await listDirectory(vfsPath);
          break;
          
        case VFS_OPERATIONS.MKDIR:
          result = await createDirectory(vfsPath, agentId);
          break;
          
        case VFS_OPERATIONS.MOVE:
          result = await moveFile(vfsPath, `vfs/${project}${targetPath}`, agentId);
          break;
          
        case VFS_OPERATIONS.COPY:
          result = await copyFile(vfsPath, `vfs/${project}${targetPath}`, agentId);
          break;
          
        case VFS_OPERATIONS.EXISTS:
          result = await checkExists(vfsPath);
          break;
          
        default:
          return res.status(400).json({ error: `Unknown operation: ${operation}` });
      }
      
      // Log operation in messages for coordination
      await logVfsOperation(operation, path, agentId, project);
      
      res.status(200).json({
        success: true,
        operation,
        path,
        result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('VFS operation error:', error);
      res.status(500).json({ error: error.message || 'VFS operation failed' });
    }
    
  } else if (req.method === 'GET') {
    // Get file or listing
    try {
      const { path, projectId } = req.query;
      const project = projectId || 'default';
      const vfsPath = `vfs/${project}${path || '/'}`;
      
      // Check if it's a file or directory
      const { data: files } = await supabase.storage
        .from('agent-files')
        .list(vfsPath, { limit: 1 });
      
      if (files && files.length > 0 && !files[0].name.endsWith('/')) {
        // It's a file, return content
        const result = await readFile(vfsPath);
        res.status(200).json({
          type: 'file',
          path,
          content: result.content,
          metadata: result.metadata
        });
      } else {
        // It's a directory, return listing
        const result = await listDirectory(vfsPath);
        res.status(200).json({
          type: 'directory',
          path,
          files: result.files,
          directories: result.directories
        });
      }
      
    } catch (error) {
      console.error('VFS get error:', error);
      res.status(500).json({ error: error.message || 'Failed to get VFS data' });
    }
    
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// VFS operation implementations
async function writeFile(path, content, agentId) {
  const fileId = crypto.randomBytes(8).toString('hex');
  const metadata = {
    lastModified: new Date().toISOString(),
    modifiedBy: agentId,
    size: content.length,
    version: 1
  };
  
  // Check if file exists for versioning
  const exists = await checkExists(path);
  if (exists) {
    const existing = await readFile(path);
    metadata.version = (existing.metadata?.version || 0) + 1;
    metadata.previousVersion = existing.id;
  }
  
  // Upload to storage
  const { data, error } = await supabase.storage
    .from('agent-files')
    .upload(path, content, {
      contentType: 'text/plain',
      upsert: true,
      metadata
    });
  
  if (error) throw error;
  
  // Store metadata in database
  await supabase
    .from('agent_files')
    .insert([{
      id: fileId,
      filename: path.split('/').pop(),
      agent_id: agentId,
      file_path: path,
      metadata,
      content_type: 'text/plain'
    }]);
  
  return { id: fileId, path, version: metadata.version };
}

async function readFile(path) {
  // Download from storage
  const { data, error } = await supabase.storage
    .from('agent-files')
    .download(path);
  
  if (error) throw new Error(`File not found: ${path}`);
  
  const content = await data.text();
  
  // Get metadata
  const { data: fileData } = await supabase
    .from('agent_files')
    .select('*')
    .eq('file_path', path)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  return {
    content,
    metadata: fileData?.metadata || {},
    id: fileData?.id
  };
}

async function deleteFile(path, agentId) {
  // Soft delete - move to trash
  const trashPath = path.replace('vfs/', 'vfs/.trash/') + '.' + Date.now();
  
  const { error: moveError } = await supabase.storage
    .from('agent-files')
    .move(path, trashPath);
  
  if (moveError) throw moveError;
  
  // Update database
  await supabase
    .from('agent_files')
    .update({ 
      file_path: trashPath,
      metadata: { deletedBy: agentId, deletedAt: new Date().toISOString() }
    })
    .eq('file_path', path);
  
  return { deleted: true, trashedAt: trashPath };
}

async function listDirectory(path) {
  const { data, error } = await supabase.storage
    .from('agent-files')
    .list(path, {
      limit: 1000,
      offset: 0
    });
  
  if (error) throw error;
  
  const files = [];
  const directories = [];
  
  for (const item of data || []) {
    if (item.name.endsWith('/')) {
      directories.push({
        name: item.name.slice(0, -1),
        path: `${path}/${item.name}`,
        type: 'directory'
      });
    } else {
      files.push({
        name: item.name,
        path: `${path}/${item.name}`,
        type: 'file',
        size: item.metadata?.size || 0,
        lastModified: item.updated_at
      });
    }
  }
  
  return { files, directories };
}

async function createDirectory(path, agentId) {
  // Create a .gitkeep file to ensure directory exists
  const keepPath = `${path}/.gitkeep`;
  await writeFile(keepPath, '', agentId);
  return { created: true, path };
}

async function moveFile(sourcePath, targetPath, agentId) {
  const { error } = await supabase.storage
    .from('agent-files')
    .move(sourcePath, targetPath);
  
  if (error) throw error;
  
  // Update database
  await supabase
    .from('agent_files')
    .update({ 
      file_path: targetPath,
      metadata: { movedBy: agentId, movedAt: new Date().toISOString() }
    })
    .eq('file_path', sourcePath);
  
  return { moved: true, from: sourcePath, to: targetPath };
}

async function copyFile(sourcePath, targetPath, agentId) {
  // Read source
  const source = await readFile(sourcePath);
  
  // Write to target
  await writeFile(targetPath, source.content, agentId);
  
  return { copied: true, from: sourcePath, to: targetPath };
}

async function checkExists(path) {
  const { data, error } = await supabase.storage
    .from('agent-files')
    .list(path.substring(0, path.lastIndexOf('/')), {
      limit: 1000
    });
  
  if (error) return false;
  
  const filename = path.split('/').pop();
  return data.some(file => file.name === filename);
}

async function logVfsOperation(operation, path, agentId, projectId) {
  // Log as a special message type for coordination visibility
  await supabase
    .from('messages')
    .insert([{
      id: crypto.randomBytes(16).toString('hex'),
      from_agent: agentId || 'system',
      to_agent: null,
      type: 'vfs_operation',
      content: JSON.stringify({
        operation,
        path,
        projectId,
        timestamp: new Date().toISOString()
      }),
      metadata: {
        operation,
        path,
        projectId
      }
    }]);
}