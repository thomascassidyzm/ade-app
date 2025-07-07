/**
 * ADE WebSocket - Real-time communication
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
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.updateStatus(true);
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('WebSocket message error:', error);
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

  handleMessage(data) {
    console.log('WebSocket message:', data);
    
    switch (data.type) {
      case 'welcome':
        console.log('Server welcome:', data.message);
        break;
        
      case 'broadcast':
        this.handleBroadcast(data);
        break;
        
      case 'error':
        console.error('Server error:', data.message);
        break;
    }
  }

  handleBroadcast(data) {
    // If on chat page, add message
    const messages = document.getElementById('chat-messages');
    if (messages && data.from !== 'user') {
      messages.innerHTML += `
        <div class="message">
          <strong>${data.from}:</strong> ${data.content}
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
      text.textContent = connected ? 'Connected' : 'Disconnected';
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
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