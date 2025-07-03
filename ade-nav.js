// ADE Navigation Component - Persistent navigation across pages

function createADENavigation() {
  const currentPath = window.location.pathname;
  const navHTML = `
    <nav class="ade-navbar">
      <div class="nav-brand">
        <a href="/" class="nav-logo">ADE</a>
      </div>
      
      <div class="nav-links">
        <a href="/" class="nav-link ${currentPath === '/' ? 'active' : ''}">
          Home
        </a>
        <a href="/chat" class="nav-link ${currentPath === '/chat' ? 'active' : ''}">
          Chat
        </a>
        <a href="/dashboard" class="nav-link ${currentPath === '/dashboard' ? 'active' : ''}">
          VFS Dashboard
        </a>
        <a href="/visualizer" class="nav-link ${currentPath === '/visualizer' ? 'active' : ''}">
          APML Visualizer
        </a>
        <a href="/builder" class="nav-link ${currentPath === '/builder' ? 'active' : ''}">
          ADE Builder
        </a>
        <a href="/cost-calculator" class="nav-link ${currentPath === '/cost-calculator' ? 'active' : ''}">
          Cost Calculator
        </a>
      </div>
      
      <div class="nav-status">
        <div class="status-dot"></div>
        <span id="agent-count">0 Agents Online</span>
      </div>
    </nav>
  `;
  
  // Insert navigation at the beginning of body
  document.body.insertAdjacentHTML('afterbegin', navHTML);
  
  // Add consistent styles
  if (!document.getElementById('ade-nav-styles')) {
    const styles = `
      <style id="ade-nav-styles">
        /* Import design system */
        @import '/ade-design-system.css';
        
        /* Navigation specific styles */
        .ade-navbar {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-primary);
          padding: var(--space-md) var(--space-xl);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .nav-logo {
          font-size: 1.5rem;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-decoration: none;
        }

        .nav-links {
          display: flex;
          gap: var(--space-xs);
        }

        .nav-link {
          padding: var(--space-sm) var(--space-md);
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
        }

        .nav-link:hover {
          background: rgba(0, 255, 136, 0.1);
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }

        .nav-link.active {
          background: rgba(0, 255, 136, 0.15);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .nav-status {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: var(--success);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Ensure body uses design system */
        body {
          margin: 0;
          padding: 0;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
        }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
  }
  
  // Connect WebSocket for agent count
  connectWebSocket();
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'agent_list') {
        const countEl = document.getElementById('agent-count');
        if (countEl) {
          countEl.textContent = `${data.agents.length} Agents Online`;
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  };
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createADENavigation);
} else {
  createADENavigation();
}