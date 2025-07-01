/**
 * Vercel Serverless Function: Agent Management
 * GET /api/agents - List all agents
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('registered_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to fetch agents' });
      }
      
      res.status(200).json({ 
        agents: data || [],
        count: data?.length || 0
      });
      
    } catch (error) {
      console.error('Get agents error:', error);
      res.status(500).json({ error: 'Failed to retrieve agents' });
    }
    
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}