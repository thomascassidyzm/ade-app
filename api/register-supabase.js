/**
 * Vercel Serverless Function: Agent Registration with Supabase
 * POST /api/register-supabase
 */

import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';

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
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { name, capabilities, endpoint } = req.body;
    const agentId = `agent-${crypto.randomBytes(8).toString('hex')}`;
    const token = crypto.randomBytes(32).toString('hex');
    
    // Insert agent into Supabase
    const { data, error } = await supabase
      .from('agents')
      .insert([{
        id: agentId,
        name,
        capabilities: capabilities || [],
        endpoint,
        status: 'active'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to register agent' });
    }
    
    res.status(200).json({ 
      agentId, 
      token,
      agent: data,
      message: 'Agent registered successfully'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register agent' });
  }
}