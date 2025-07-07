/**
 * ADE WebSocket - APML Native Communication
 */

class ADEWebSocket {
  constructor() {
    this.ws = null;
    this.reconnectInterval = 5000;
    this.shouldReconnect = true;
    this.init();
  }

  init() {
    this.connect();
    
    // Reconnect on page visibility
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.ws?.readyState !== WebSocket.OPEN) {
        this.connect();
      }
    });
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log('Connecting to APML WebSocket:', wsUrl);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('✅ APML WebSocket connected');
      this.updateStatus(true);
    };
    
    this.ws.onmessage = (event) => {
      try {
        // Parse APML message
        const message = APML.parse(event.data);
        this.handleAPMLMessage(message);
      } catch (error) {
        console.error('APML WebSocket parse error:', error);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateStatus(false);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.updateStatus(false);
      
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };
    
    // Make WebSocket available globally
    window.ws = this.ws;
  }

  handleAPMLMessage(message) {
    console.log('APML message received:', message);
    
    switch (message.type) {
      case 'welcome':
        console.log('Server welcome:', message.message);
        break;
        
      case 'broadcast':
        this.handleBroadcast(message);
        break;
        
      case 'error':
        console.error('Server error:', message.error, message.message);
        break;
        
      default:
        // Add to chat if on chat page
        const messages = document.getElementById('chat-messages');
        if (messages) {
          messages.innerHTML += `
            <div class="message">
              <pre>${APML.stringify(message)}</pre>
            </div>
          `;
          messages.scrollTop = messages.scrollHeight;
        }
    }
  }

  handleBroadcast(message) {
    // Add to chat
    const messages = document.getElementById('chat-messages');
    if (messages) {
      messages.innerHTML += `
        <div class="message">
          <pre>${APML.stringify(message)}</pre>
        </div>
      `;
      messages.scrollTop = messages.scrollHeight;
    }
  }

  updateStatus(connected) {
    const indicator = document.getElementById('connection-status');
    const text = document.getElementById('connection-text');
    
    if (indicator) {
      indicator.classList.toggle('connected', connected);
    }
    
    if (text) {
      text.textContent = connected ? 'Connected (APML)' : 'Disconnected';
    }
  }

  sendAPML(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Ensure message has APML header
      if (!message.apml) {
        message.apml = '1.0';
      }
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }
      
      const apmlString = APML.stringify(message);
      this.ws.send(apmlString);
    } else {
      console.error('WebSocket not connected');
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Initialize WebSocket
const adeWs = new ADEWebSocket();