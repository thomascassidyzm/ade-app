/**
 * ADE App - Main application logic
 */

class ADEApp {
  constructor() {
    this.apiUrl = window.location.origin + '/api';
    this.agents = [];
    this.files = [];
    this.currentFile = null;
  }

  async init() {
    console.log('🚀 Initializing ADE...');
    
    // Check server health
    try {
      const health = await this.fetch('/health');
      console.log('✅ Server healthy:', health);
    } catch (error) {
      console.error('❌ Server health check failed:', error);
    }
    
    // Initialize based on current route
    this.handleRouteChange();
  }

  async fetch(endpoint, options = {}) {
    const response = await fetch(this.apiUrl + endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
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
    // Home page is static, nothing to load
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
      const data = await this.fetch('/agents');
      this.agents = data.agents;
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
      </div>
    `).join('');
  }

  async loadFilesPage() {
    try {
      const data = await this.fetch('/vfs/list');
      this.files = data.files;
      this.renderFiles();
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }

  renderFiles() {
    const container = document.getElementById('files-list');
    if (!container) return;
    
    if (this.files.length === 0) {
      container.innerHTML = '<div class="empty-state">No files yet</div>';
      return;
    }
    
    container.innerHTML = this.files.map(file => `
      <div class="file-item" onclick="ade.loadFile('${file}')">${file}</div>
    `).join('');
  }

  async loadFile(path) {
    try {
      const data = await this.fetch('/vfs/read/' + encodeURIComponent(path));
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
    
    // Load available tools
    try {
      const data = await this.fetch('/mcp', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
      });
      
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

  // Chat functionality
  async sendMessage() {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    
    if (!input || !messages) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // Add user message
    messages.innerHTML += `
      <div class="message user">
        <strong>You:</strong> ${this.escapeHtml(message)}
      </div>
    `;
    
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
    
    // Send via WebSocket
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({
        type: 'chat',
        from: 'user',
        content: message
      }));
    }
    
    // Simulate response for now
    setTimeout(() => {
      messages.innerHTML += `
        <div class="message assistant">
          <strong>ADE:</strong> I received your message: "${this.escapeHtml(message)}". 
          The agent system is being built to process your requests.
        </div>
      `;
      messages.scrollTop = messages.scrollHeight;
    }, 1000);
  }

  // Agent creation
  async createAgent() {
    const name = prompt('Agent name:');
    if (!name) return;
    
    const capabilities = prompt('Capabilities (comma-separated):');
    if (!capabilities) return;
    
    try {
      const response = await this.fetch('/agents/register', {
        method: 'POST',
        body: JSON.stringify({
          id: `agent-${Date.now()}`,
          name,
          capabilities: capabilities.split(',').map(c => c.trim())
        })
      });
      
      if (response.success) {
        alert('Agent created successfully!');
        this.loadAgentsPage();
      }
    } catch (error) {
      alert('Failed to create agent: ' + error.message);
    }
  }

  // File creation
  async createFile() {
    const path = prompt('File path:');
    if (!path) return;
    
    const content = prompt('File content:');
    if (content === null) return;
    
    try {
      const response = await this.fetch('/vfs/write', {
        method: 'POST',
        body: JSON.stringify({ path, content })
      });
      
      if (response.success) {
        alert('File created successfully!');
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