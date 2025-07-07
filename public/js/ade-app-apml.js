/**
 * ADE App - APML Native Version
 * All communications use APML format
 */

class ADEApp {
  constructor() {
    this.apiUrl = window.location.origin + '/api';
    this.agents = [];
    this.files = [];
    this.currentFile = null;
  }

  async init() {
    console.log('🚀 Initializing ADE (APML Native)...');
    
    // Check server health using APML
    try {
      const health = await this.fetchAPML('/health');
      console.log('✅ Server healthy:', health);
    } catch (error) {
      console.error('❌ Server health check failed:', error);
    }
    
    // Initialize based on current route
    this.handleRouteChange();
  }

  async fetchAPML(endpoint, options = {}) {
    const response = await fetch(this.apiUrl + endpoint, {
      headers: {
        'Content-Type': 'application/apml',
        'Accept': 'application/apml',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const apmlText = await response.text();
    return APML.parse(apmlText);
  }

  async sendAPML(endpoint, data, method = 'POST') {
    const apmlString = APML.stringify(data);
    
    return this.fetchAPML(endpoint, {
      method,
      body: apmlString
    });
  }

  handleRouteChange() {
    const route = window.location.hash.slice(2) || 'home';
    
    switch (route) {
      case 'home':
        this.loadHomePage();
        break;
      case 'chat':
        this.loadChatPage();
        break;
      case 'agents':
        this.loadAgentsPage();
        break;
      case 'files':
        this.loadFilesPage();
        break;
      case 'tools':
        this.loadToolsPage();
        break;
    }
  }

  loadHomePage() {
    // Home page is static
  }

  loadChatPage() {
    // Focus on chat input
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) input.focus();
    }, 100);
  }

  async loadAgentsPage() {
    try {
      const data = await this.fetchAPML('/agents');
      this.agents = data.agents || [];
      this.renderAgents();
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  renderAgents() {
    const container = document.getElementById('agents-list');
    if (!container) return;
    
    if (this.agents.length === 0) {
      container.innerHTML = '<div class="empty-state">No agents registered yet</div>';
      return;
    }
    
    container.innerHTML = this.agents.map(agent => `
      <div class="agent-card">
        <div class="agent-status">${agent.status}</div>
        <h3>${agent.name}</h3>
        <p class="text-secondary text-small">ID: ${agent.id}</p>
        <p class="text-small">Capabilities: ${agent.capabilities.join(', ')}</p>
        <pre class="text-small"><code>---
apml: 1.0
type: agent_info
---
id: ${agent.id}
name: ${agent.name}
status: ${agent.status}
capabilities:
${agent.capabilities.map(c => '  - ' + c).join('\n')}</code></pre>
      </div>
    `).join('');
  }

  async loadFilesPage() {
    try {
      const data = await this.fetchAPML('/vfs/list');
      this.files = data.files || [];
      this.renderFiles();
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }

  renderFiles() {
    const container = document.getElementById('files-list');
    if (!container) return;
    
    if (this.files.length === 0) {
      container.innerHTML = '<div class="empty-state">No APML files yet</div>';
      return;
    }
    
    container.innerHTML = this.files.map(file => `
      <div class="file-item" onclick="ade.loadFile('${file}')">${file}</div>
    `).join('');
  }

  async loadFile(path) {
    try {
      const data = await this.fetchAPML('/vfs/read/' + encodeURIComponent(path));
      this.currentFile = { path, ...data };
      this.renderFileContent();
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  }

  renderFileContent() {
    const container = document.getElementById('file-content');
    if (!container || !this.currentFile) return;
    
    container.innerHTML = `
      <h3>${this.currentFile.path}</h3>
      <p class="text-secondary text-small">Updated: ${new Date(this.currentFile.updatedAt).toLocaleString()}</p>
      <pre><code>${this.escapeHtml(this.currentFile.content)}</code></pre>
    `;
  }

  async loadToolsPage() {
    // Update MCP URL
    const mcpUrl = document.getElementById('mcp-url');
    if (mcpUrl) {
      mcpUrl.textContent = window.location.origin;
    }
    
    // Load available tools - MCP still uses JSON
    try {
      const response = await fetch(this.apiUrl + '/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
      });
      
      const data = await response.json();
      
      if (data.result && data.result.tools) {
        this.renderTools(data.result.tools);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  }

  renderTools(tools) {
    const container = document.getElementById('tools-list');
    if (!container) return;
    
    container.innerHTML = tools.map(tool => `
      <div class="card">
        <h4>${tool.name}</h4>
        <p class="text-secondary">${tool.description}</p>
        <pre><code>${JSON.stringify(tool.inputSchema, null, 2)}</code></pre>
      </div>
    `).join('');
  }

  // Send APML message
  async sendAPMLMessage() {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    
    if (!input || !messages) return;
    
    const apmlText = input.value.trim();
    if (!apmlText) return;
    
    // Parse and validate APML
    let message;
    try {
      message = APML.parse(apmlText);
    } catch (error) {
      alert('Invalid APML format: ' + error.message);
      return;
    }
    
    // Add to chat
    messages.innerHTML += `
      <div class="message user">
        <pre>${this.escapeHtml(apmlText)}</pre>
      </div>
    `;
    
    // Clear input with template
    input.value = `---
apml: 1.0
type: brief
from: user
to: all
---
task: `;
    
    messages.scrollTop = messages.scrollHeight;
    
    // Send via WebSocket
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(apmlText);
    }
  }

  // Create agent with APML
  async createAgentAPML() {
    const apmlTemplate = `---
apml: 1.0
type: agent_registration
---
id: agent-${Date.now()}
name: New Agent
capabilities:
  - capability1
  - capability2`;
    
    const apmlText = prompt('Enter agent registration APML:', apmlTemplate);
    if (!apmlText) return;
    
    try {
      const agentData = APML.parse(apmlText);
      const response = await this.sendAPML('/agents/register', agentData);
      
      if (response.success) {
        alert('Agent registered successfully!');
        this.loadAgentsPage();
      }
    } catch (error) {
      alert('Failed to register agent: ' + error.message);
    }
  }

  // Create APML file
  async createAPMLFile() {
    const path = prompt('APML file path (e.g., specs/my-app.apml):');
    if (!path) return;
    
    const apmlTemplate = `---
apml: 1.0
type: specification
---
name: My Specification
description: Description here`;
    
    const content = prompt('APML content:', apmlTemplate);
    if (content === null) return;
    
    try {
      const fileData = {
        apml: '1.0',
        type: 'file_write',
        path: path,
        content: content
      };
      
      const response = await this.sendAPML('/vfs/write', fileData);
      
      if (response.success) {
        alert('APML file created successfully!');
        this.loadFilesPage();
      }
    } catch (error) {
      alert('Failed to create file: ' + error.message);
    }
  }

  // Utilities
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app
const ade = new ADEApp();
document.addEventListener('DOMContentLoaded', () => {
  ade.init();
});