/**
 * Vercel Serverless Function: Message Handling
 * POST /api/messages - Send message
 * GET /api/messages - Get messages
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
    // Send message
    try {
      const { from, to, type, content, metadata } = req.body;
      
      const messageId = crypto.randomBytes(16).toString('hex');
      
      // Insert message into Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          id: messageId,
          from_agent: from,
          to_agent: to,
          type: type || 'text',
          content,
          metadata: metadata || {}
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to send message' });
      }
      
      res.status(200).json({ 
        messageId: data.id,
        timestamp: data.created_at 
      });
      
    } catch (error) {
      console.error('Message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
    
  } else if (req.method === 'GET') {
    // Get messages
    try {
      const limit = parseInt(req.query.limit) || 50;
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to retrieve messages' });
      }
      
      // Convert to expected format
      const messages = data.map(msg => ({
        id: msg.id,
        from: msg.from_agent,
        to: msg.to_agent,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        timestamp: msg.created_at
      })).reverse();
      
      res.status(200).json({ 
        messages,
        count: messages.length 
      });
      
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to retrieve messages' });
    }
    
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}