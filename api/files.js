/**
 * Vercel Serverless Function: File Management
 * POST /api/files - Upload file
 * GET /api/files - List files
 * GET /api/files/[id] - Get specific file
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
    // Upload file
    try {
      const { agentId, filename, content, metadata } = req.body;
      
      const fileId = crypto.randomBytes(16).toString('hex');
      const filePath = `agent-files/${agentId}/${fileId}-${filename}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('agent-files')
        .upload(filePath, content, {
          contentType: metadata?.contentType || 'text/plain',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload file' });
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('agent-files')
        .getPublicUrl(filePath);
      
      // Store metadata in database
      const { data, error } = await supabase
        .from('agent_files')
        .insert([{
          id: fileId,
          filename,
          agent_id: agentId,
          content_type: metadata?.contentType || 'text/plain',
          file_path: filePath,
          metadata: metadata || {}
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Failed to save file metadata' });
      }
      
      res.status(200).json({ 
        fileId,
        url: urlData.publicUrl,
        file: data,
        message: 'File uploaded successfully'
      });
      
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
    
  } else if (req.method === 'GET') {
    const { id } = req.query;
    
    if (id) {
      // Get specific file
      try {
        const { data, error } = await supabase
          .from('agent_files')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error || !data) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('agent-files')
          .getPublicUrl(data.file_path);
        
        res.status(200).json({
          ...data,
          url: urlData.publicUrl
        });
        
      } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({ error: 'Failed to retrieve file' });
      }
      
    } else {
      // List files
      try {
        const limit = parseInt(req.query.limit) || 50;
        
        const { data, error } = await supabase
          .from('agent_files')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) {
          console.error('Database error:', error);
          return res.status(500).json({ error: 'Failed to list files' });
        }
        
        // Add public URLs
        const filesWithUrls = data.map(file => {
          const { data: urlData } = supabase.storage
            .from('agent-files')
            .getPublicUrl(file.file_path);
          
          return {
            id: file.id,
            filename: file.filename,
            agentId: file.agent_id,
            createdAt: file.created_at,
            url: urlData.publicUrl
          };
        });
        
        res.status(200).json({ 
          files: filesWithUrls,
          count: filesWithUrls.length 
        });
        
      } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ error: 'Failed to list files' });
      }
    }
    
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}