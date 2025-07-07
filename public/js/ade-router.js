/**
 * ADE Router - Simple client-side routing
 */

class Router {
  constructor() {
    this.routes = {
      home: 'home-template',
      chat: 'chat-template',
      agents: 'agents-template',
      files: 'files-template',
      tools: 'tools-template'
    };
    
    this.init();
  }

  init() {
    // Handle initial route
    this.handleRoute();
    
    // Handle route changes
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Handle navigation clicks
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        this.navigate(route);
      });
    });
  }

  handleRoute() {
    const hash = window.location.hash.slice(1);
    const route = hash.slice(1) || 'home';
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-route') === route);
    });
    
    // Load template
    const templateId = this.routes[route];
    if (templateId) {
      this.loadTemplate(templateId);
      
      // Notify app of route change
      if (window.ade) {
        window.ade.handleRouteChange();
      }
    }
  }

  loadTemplate(templateId) {
    const template = document.getElementById(templateId);
    const content = document.getElementById('main-content');
    
    if (template && content) {
      content.innerHTML = template.innerHTML;
    }
  }

  navigate(route) {
    window.location.hash = `#/${route}`;
  }
}

// Initialize router
const router = new Router();