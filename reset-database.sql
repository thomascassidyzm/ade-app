-- RESET DATABASE: Multi-Agent Coordination System
-- WARNING: This will delete ALL existing data
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS agent_files CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- Delete storage bucket and all files
DELETE FROM storage.objects WHERE bucket_id = 'agent-files';
DELETE FROM storage.buckets WHERE id = 'agent-files';

-- Now create fresh tables
-- Create agents table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capabilities JSONB DEFAULT '[]',
  endpoint TEXT,
  status TEXT DEFAULT 'active',
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  from_agent TEXT NOT NULL,
  to_agent TEXT,
  type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE agent_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  content_type TEXT DEFAULT 'text/plain',
  file_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table (for future use)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  dependencies JSONB DEFAULT '[]',
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  assigned_to TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for agent files
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-files', 'agent-files', true);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now)
CREATE POLICY "Allow all operations on agents" ON agents FOR ALL USING (true);
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all operations on agent_files" ON agent_files FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);

-- Storage policy
CREATE POLICY "Allow all operations on agent files bucket" 
ON storage.objects FOR ALL 
USING (bucket_id = 'agent-files');

-- Create indexes for performance
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_from_agent ON messages(from_agent);
CREATE INDEX idx_messages_to_agent ON messages(to_agent);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_files_agent_id ON agent_files(agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Enable real-time (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_files;