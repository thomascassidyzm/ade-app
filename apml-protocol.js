// APML Protocol Handler
// Converts between APML messages and WebSocket communication

class APMLProtocol {
  constructor() {
    this.messageTypes = {
      // Agent coordination messages
      REGISTER: 'register',
      BRIEF: 'brief',
      HANDOFF: 'handoff',
      STATUS: 'status',
      RESULT: 'result',
      ERROR: 'error',
      
      // User interaction messages
      REQUEST: 'request',
      RESPONSE: 'response',
      PROGRESS: 'progress',
      
      // File/VFS operations
      FILE: 'file',
      VFS: 'vfs'
    };
  }

  // Parse APML message string to object
  parseAPML(apmlString) {
    // APML uses YAML-like syntax
    const lines = apmlString.trim().split('\n');
    const message = {
      metadata: {},
      content: {}
    };
    
    let currentSection = 'root';
    let indentLevel = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const indent = line.length - line.trimStart().length;
      
      // Parse key-value pairs
      if (trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        
        // Handle different sections
        if (indent === 0) {
          message[key.trim()] = value || {};
          currentSection = key.trim();
        } else {
          if (typeof message[currentSection] === 'string') {
            message[currentSection] = {};
          }
          message[currentSection][key.trim()] = this.parseValue(value);
        }
      }
    }
    
    return message;
  }

  // Convert object to APML format
  toAPML(messageObj) {
    let apml = '';
    
    // Add type and metadata
    apml += `type: ${messageObj.type}\n`;
    if (messageObj.from) apml += `from: ${messageObj.from}\n`;
    if (messageObj.to) apml += `to: ${messageObj.to}\n`;
    if (messageObj.timestamp) apml += `timestamp: ${messageObj.timestamp}\n`;
    
    // Add content sections
    Object.entries(messageObj).forEach(([key, value]) => {
      if (['type', 'from', 'to', 'timestamp'].includes(key)) return;
      
      if (typeof value === 'object' && value !== null) {
        apml += `\n${key}:\n`;
        Object.entries(value).forEach(([subKey, subValue]) => {
          apml += `  ${subKey}: ${this.stringifyValue(subValue)}\n`;
        });
      } else {
        apml += `${key}: ${this.stringifyValue(value)}\n`;
      }
    });
    
    return apml.trim();
  }

  // Create standard APML messages
  createMessage(type, from, to, content) {
    return {
      type,
      from,
      to,
      timestamp: new Date().toISOString(),
      ...content
    };
  }

  // Agent registration message
  createRegisterMessage(agentId, capabilities, layer) {
    return this.toAPML({
      type: 'register',
      from: agentId,
      to: 'hub',
      timestamp: new Date().toISOString(),
      agent: {
        id: agentId,
        layer: layer,
        capabilities: capabilities.join(', ')
      }
    });
  }

  // Task brief message (L1 → L2)
  createBriefMessage(from, to, task, context = {}) {
    return this.toAPML({
      type: 'brief',
      from,
      to,
      timestamp: new Date().toISOString(),
      task: {
        description: task,
        priority: context.priority || 'normal',
        deadline: context.deadline || 'none'
      },
      context: context.details || {}
    });
  }

  // Task handoff message (L2 → L3)
  createHandoffMessage(from, to, specification) {
    return this.toAPML({
      type: 'handoff',
      from,
      to,
      timestamp: new Date().toISOString(),
      package: specification
    });
  }

  // Status update message
  createStatusMessage(from, to, status, details = {}) {
    return this.toAPML({
      type: 'status',
      from,
      to,
      timestamp: new Date().toISOString(),
      status: {
        state: status,
        progress: details.progress || 0,
        message: details.message || ''
      }
    });
  }

  // Result delivery message
  createResultMessage(from, to, result, artifacts = []) {
    return this.toAPML({
      type: 'result',
      from,
      to,
      timestamp: new Date().toISOString(),
      result: {
        success: result.success,
        summary: result.summary,
        details: result.details || {}
      },
      artifacts: artifacts.map(a => ({
        type: a.type,
        path: a.path,
        description: a.description
      }))
    });
  }

  // User request message
  createUserRequestMessage(userId, request, context = {}) {
    return this.toAPML({
      type: 'request',
      from: `user_${userId}`,
      to: 'L1_ORCH',
      timestamp: new Date().toISOString(),
      request: {
        text: request,
        intent: context.intent || 'unknown',
        context: context
      }
    });
  }

  // Helper methods
  parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (!isNaN(value) && value !== '') return Number(value);
    return value;
  }

  stringifyValue(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  // Validate APML message
  validate(message) {
    const required = ['type', 'from', 'to'];
    for (const field of required) {
      if (!message[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    
    if (!Object.values(this.messageTypes).includes(message.type)) {
      return { valid: false, error: `Unknown message type: ${message.type}` };
    }
    
    return { valid: true };
  }
}

// Example APML messages:
/*

# Agent Registration
type: register
from: L2_Frontend
to: hub
timestamp: 2024-01-20T10:30:00Z
agent:
  id: L2_Frontend
  layer: L2
  capabilities: UI coordination, component design, state management

# Task Brief (L1 → L2)
type: brief
from: L1_ORCH
to: L2_Frontend
timestamp: 2024-01-20T10:31:00Z
task:
  description: Create user dashboard with real-time updates
  priority: high
  deadline: 2024-01-20T12:00:00Z
context:
  features: user stats, activity feed, notifications
  design: modern, responsive, dark theme

# Task Handoff (L2 → L3)
type: handoff
from: L2_Frontend
to: L3_React
timestamp: 2024-01-20T10:35:00Z
package:
  Dashboard:
    components:
      - type: Header
        props: 
          title: Dashboard
          user: ${currentUser}
      - type: StatsGrid
        props:
          metrics: ${userMetrics}
      - type: ActivityFeed
        props:
          activities: ${recentActivities}
    state:
      currentUser: object
      userMetrics: array
      recentActivities: array
    styling:
      theme: dark
      responsive: true

# Status Update
type: status
from: L3_React
to: L2_Frontend
timestamp: 2024-01-20T10:40:00Z
status:
  state: in_progress
  progress: 60
  message: Implementing StatsGrid component

# Result Delivery
type: result
from: L2_Frontend
to: L1_ORCH
timestamp: 2024-01-20T11:00:00Z
result:
  success: true
  summary: Dashboard implementation complete
  details:
    components: 3
    tests: 12
    coverage: 85%
artifacts:
  - type: code
    path: /src/components/Dashboard.jsx
    description: Main dashboard component
  - type: styles
    path: /src/styles/dashboard.css
    description: Dashboard styling

*/

module.exports = APMLProtocol;