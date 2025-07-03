// APML to Live Preview Compiler
// Converts APML to functioning HTML/CSS/JS in real-time

class APMLToLivePreview {
  constructor() {
    this.components = new Map();
    this.styles = new Map();
    this.eventHandlers = new Map();
  }

  // Main compilation entry point
  compileToLiveApp(apmlSpec) {
    // Reset state
    this.components.clear();
    this.styles.clear();
    this.eventHandlers.clear();

    // Generate HTML structure
    const html = this.generateHTML(apmlSpec);
    
    // Generate CSS
    const css = this.generateCSS(apmlSpec);
    
    // Generate JavaScript
    const js = this.generateJavaScript(apmlSpec);
    
    // Combine into complete app
    return this.createLiveApp(html, css, js, apmlSpec);
  }

  // Generate HTML from APML
  generateHTML(apmlSpec) {
    const screens = apmlSpec.screens || [];
    let html = `
      <div id="app" class="app-container">
        <div class="app-navigation" id="app-nav"></div>
        <div class="app-content" id="app-content">
    `;

    // Generate each screen
    screens.forEach((screen, index) => {
      html += `
        <div class="app-screen ${index === 0 ? 'active' : ''}" id="screen-${screen.id}">
          ${this.generateScreenHTML(screen)}
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  // Generate HTML for a single screen
  generateScreenHTML(screen) {
    let html = '';
    
    if (screen.components) {
      screen.components.forEach(component => {
        html += this.generateComponentHTML(component);
      });
    }

    return html;
  }

  // Generate HTML for a component
  generateComponentHTML(component) {
    switch (component.type) {
      case 'Header':
        return `
          <header class="component-header">
            <h1>${component.props?.title || 'App'}</h1>
            ${component.props?.actions ? this.generateHeaderActions(component.props.actions) : ''}
          </header>
        `;

      case 'TextInput':
        return `
          <div class="component-input-group">
            <input 
              type="${component.props?.type || 'text'}"
              placeholder="${component.props?.placeholder || ''}"
              id="${component.id}"
              class="component-input"
              ${component.props?.required ? 'required' : ''}
            />
          </div>
        `;

      case 'Button':
        const buttonId = `btn-${component.id}`;
        this.eventHandlers.set(buttonId, component.props?.action);
        return `
          <button 
            id="${buttonId}"
            class="component-button ${component.props?.style || 'primary'}"
            data-action="${component.props?.action || ''}"
          >
            ${component.props?.text || 'Button'}
          </button>
        `;

      case 'List':
        return `
          <div class="component-list" id="${component.id}">
            ${component.props?.emptyMessage ? 
              `<p class="empty-message">${component.props.emptyMessage}</p>` : 
              '<div class="list-items"></div>'
            }
          </div>
        `;

      case 'Container':
        return `
          <div class="component-container ${component.layout}-layout">
            ${component.components?.map(child => 
              this.generateComponentHTML(child)
            ).join('') || ''}
          </div>
        `;

      default:
        return `<div class="component-${component.type.toLowerCase()}">${component.type}</div>`;
    }
  }

  // Generate header actions
  generateHeaderActions(actions) {
    return `
      <div class="header-actions">
        ${actions.map(action => `
          <button class="header-action" data-action="${action.action}">
            <span class="icon">${this.getIcon(action.icon)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  // Get icon for action
  getIcon(iconName) {
    const icons = {
      filter: '🔍',
      plus: '➕',
      menu: '☰',
      back: '←',
      settings: '⚙️'
    };
    return icons[iconName] || '•';
  }

  // Generate CSS
  generateCSS(apmlSpec) {
    return `
      /* Base App Styles */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      .app-container {
        width: 100%;
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        background: #f5f5f5;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .app-content {
        flex: 1;
        overflow-y: auto;
        position: relative;
      }

      .app-screen {
        display: none;
        min-height: 100%;
        padding: 1rem;
        animation: fadeIn 0.3s ease;
      }

      .app-screen.active {
        display: block;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Components */
      .component-header {
        background: white;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: -1rem -1rem 1rem -1rem;
      }

      .component-header h1 {
        font-size: 1.25rem;
        color: #333;
      }

      .header-actions {
        display: flex;
        gap: 0.5rem;
      }

      .header-action {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.5rem;
      }

      .component-input-group {
        margin-bottom: 1rem;
      }

      .component-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.3s;
      }

      .component-input:focus {
        outline: none;
        border-color: #007AFF;
      }

      .component-button {
        width: 100%;
        padding: 0.875rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        margin-bottom: 1rem;
      }

      .component-button.primary {
        background: #007AFF;
        color: white;
      }

      .component-button.primary:hover {
        background: #0056b3;
      }

      .component-button.secondary {
        background: #f0f0f0;
        color: #333;
      }

      .component-list {
        background: white;
        border-radius: 8px;
        padding: 1rem;
        min-height: 200px;
      }

      .empty-message {
        text-align: center;
        color: #999;
        padding: 2rem;
      }

      .list-item {
        padding: 0.75rem;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        transition: background 0.2s;
      }

      .list-item:hover {
        background: #f9f9f9;
      }

      /* Layouts */
      .vertical-layout {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .horizontal-layout {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        align-items: center;
      }

      /* Navigation */
      .app-navigation {
        display: none;
        background: white;
        border-bottom: 1px solid #ddd;
        padding: 0.5rem;
      }

      .app-navigation.visible {
        display: flex;
        gap: 0.5rem;
      }

      .nav-tab {
        padding: 0.5rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
        font-weight: 500;
        color: #666;
      }

      .nav-tab.active {
        color: #007AFF;
        border-bottom: 2px solid #007AFF;
      }
    `;
  }

  // Generate JavaScript
  generateJavaScript(apmlSpec) {
    let js = `
      // App State
      const appState = {
        currentScreen: '${apmlSpec.screens?.[0]?.id || 'home'}',
        data: {},
        user: null
      };

      // Screen Navigation
      function navigateToScreen(screenId) {
        document.querySelectorAll('.app-screen').forEach(screen => {
          screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById('screen-' + screenId);
        if (targetScreen) {
          targetScreen.classList.add('active');
          appState.currentScreen = screenId;
        }
      }

      // Event Handlers
    `;

    // Generate navigation handlers
    if (apmlSpec.screens && apmlSpec.screens.length > 0) {
      apmlSpec.screens.forEach(screen => {
        if (screen.navigation) {
          Object.entries(screen.navigation).forEach(([event, target]) => {
            js += `
      function handle_${event}() {
        navigateToScreen('${target}');
      }
            `;
          });
        }
      });
    }

    // Add button click handlers
    this.eventHandlers.forEach((action, buttonId) => {
      js += `
      document.addEventListener('DOMContentLoaded', function() {
        const ${buttonId} = document.getElementById('${buttonId}');
        if (${buttonId}) {
          ${buttonId}.addEventListener('click', function() {
            handleAction('${action}');
          });
        }
      });
      `;
    });

    // Generic action handler
    js += `
      function handleAction(action) {
        console.log('Action triggered:', action);
        
        switch(action) {
          case 'authenticate':
            handleLogin();
            break;
          case 'navigateToCreateTask':
            navigateToScreen('CreateTaskScreen');
            break;
          case 'navigateToTaskDetail':
            navigateToScreen('TaskDetailScreen');
            break;
          default:
            if (action.startsWith('navigateTo')) {
              const screenName = action.replace('navigateTo', '');
              navigateToScreen(screenName);
            }
        }
      }

      // Example handlers
      function handleLogin() {
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        
        if (emailInput && passwordInput) {
          console.log('Login attempt:', emailInput.value);
          // Simulate login
          setTimeout(() => {
            appState.user = { email: emailInput.value };
            navigateToScreen('HomeScreen');
          }, 1000);
        }
      }

      // Initialize app
      document.addEventListener('DOMContentLoaded', function() {
        console.log('App initialized');
        
        // Set up navigation if multiple screens
        const screens = document.querySelectorAll('.app-screen');
        if (screens.length > 1) {
          setupNavigation();
        }
      });

      function setupNavigation() {
        const nav = document.getElementById('app-nav');
        if (nav && ${JSON.stringify(apmlSpec.screens || [])}.length > 0) {
          nav.classList.add('visible');
          nav.innerHTML = ${JSON.stringify(apmlSpec.screens || [])}.map(screen => 
            '<button class="nav-tab" onclick="navigateToScreen(\\'' + screen.id + '\\')">' + 
            screen.id.replace('Screen', '') + '</button>'
          ).join('');
          
          // Highlight active tab
          updateNavTabs();
        }
      }

      function updateNavTabs() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
          tab.classList.remove('active');
          if (tab.textContent + 'Screen' === appState.currentScreen) {
            tab.classList.add('active');
          }
        });
      }
    `;

    return js;
  }

  // Create complete live app
  createLiveApp(html, css, js, apmlSpec) {
    const appHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${apmlSpec.project?.name || 'App Preview'}</title>
    <style>${css}</style>
</head>
<body>
    ${html}
    <script>${js}</script>
</body>
</html>
    `;

    return {
      html: appHTML,
      css,
      js,
      fullApp: appHTML
    };
  }
}

// Export for use in ADE Builder
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APMLToLivePreview;
}