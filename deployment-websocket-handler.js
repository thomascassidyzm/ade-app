// Deployment WebSocket Handler
// Real-time deployment updates for ADE interface

const ADEDeploymentOrchestrator = require('./ade-deployment-orchestrator');

class DeploymentWebSocketHandler {
  constructor(wss) {
    this.wss = wss;
    this.orchestrator = new ADEDeploymentOrchestrator();
    this.activeDeployments = new Map();
    
    this.setupOrchestratorListeners();
  }

  // Set up listeners for orchestrator events
  setupOrchestratorListeners() {
    // Deployment lifecycle events
    this.orchestrator.on('deployment:started', (data) => {
      this.broadcast({
        type: 'deployment_started',
        ...data
      });
    });

    this.orchestrator.on('deployment:status', (data) => {
      this.broadcast({
        type: 'deployment_status',
        ...data
      });
    });

    this.orchestrator.on('code:generating', (data) => {
      this.broadcast({
        type: 'code_generating',
        message: 'Generating code from APML specification...',
        ...data
      });
    });

    this.orchestrator.on('code:generated', (data) => {
      this.broadcast({
        type: 'code_generated',
        message: `Generated ${data.fileCount} files`,
        ...data
      });
    });

    this.orchestrator.on('deployment:uploading', (data) => {
      this.broadcast({
        type: 'deployment_uploading',
        message: 'Uploading to Railway...',
        ...data
      });
    });

    this.orchestrator.on('deployment:completed', (data) => {
      this.broadcast({
        type: 'deployment_completed',
        message: 'Deployment successful!',
        ...data
      });
    });

    this.orchestrator.on('deployment:failed', (data) => {
      this.broadcast({
        type: 'deployment_failed',
        message: `Deployment failed: ${data.error}`,
        ...data
      });
    });

    this.orchestrator.on('validation:passed', (data) => {
      this.broadcast({
        type: 'validation_passed',
        message: 'Code validation successful',
        ...data
      });
    });
  }

  // Handle incoming WebSocket messages
  async handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'deploy_apml':
          await this.handleDeployAPML(ws, data);
          break;
          
        case 'quick_deploy':
          await this.handleQuickDeploy(ws, data);
          break;
          
        case 'get_deployment_status':
          this.handleGetDeploymentStatus(ws, data);
          break;
          
        case 'cancel_deployment':
          this.handleCancelDeployment(ws, data);
          break;
          
        case 'subscribe_deployment':
          this.handleSubscribeDeployment(ws, data);
          break;
          
        default:
          // Pass through to other handlers
          return false;
      }
      
      return true;
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
      return true;
    }
  }

  // Handle APML deployment request
  async handleDeployAPML(ws, data) {
    const { apmlMessages, options = {} } = data;
    
    if (!apmlMessages || !Array.isArray(apmlMessages)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid APML messages'
      }));
      return;
    }

    try {
      // Start deployment
      const result = await this.orchestrator.deployFromAPML(
        apmlMessages,
        options
      );
      
      // Track active deployment
      this.activeDeployments.set(result.deploymentId, {
        ws,
        result,
        startTime: Date.now()
      });
      
      // Send initial response
      ws.send(JSON.stringify({
        type: 'deployment_initiated',
        deploymentId: result.deploymentId,
        projectInfo: result.projectInfo
      }));
      
      // Set up log streaming for this client
      this.orchestrator.streamDeploymentLogs(
        result.deploymentId,
        (log) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: 'deployment_log',
              deploymentId: result.deploymentId,
              log
            }));
          }
        }
      );
      
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'deployment_error',
        error: error.message
      }));
    }
  }

  // Handle quick deployment from description
  async handleQuickDeploy(ws, data) {
    const { description, options = {} } = data;
    
    if (!description) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Description required for quick deploy'
      }));
      return;
    }

    try {
      const result = await this.orchestrator.quickDeploy(
        description,
        options
      );
      
      ws.send(JSON.stringify({
        type: 'quick_deploy_started',
        deploymentId: result.deploymentId,
        description
      }));
      
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'quick_deploy_error',
        error: error.message
      }));
    }
  }

  // Get deployment status
  handleGetDeploymentStatus(ws, data) {
    const { deploymentId } = data;
    
    const status = this.orchestrator.getDeploymentStatus(deploymentId);
    
    ws.send(JSON.stringify({
      type: 'deployment_status_response',
      deploymentId,
      status: status || { status: 'not_found' }
    }));
  }

  // Cancel deployment (placeholder)
  handleCancelDeployment(ws, data) {
    const { deploymentId } = data;
    
    // TODO: Implement deployment cancellation
    ws.send(JSON.stringify({
      type: 'deployment_cancelled',
      deploymentId,
      message: 'Deployment cancellation not yet implemented'
    }));
  }

  // Subscribe to deployment updates
  handleSubscribeDeployment(ws, data) {
    const { deploymentId } = data;
    
    this.orchestrator.streamDeploymentLogs(
      deploymentId,
      (log) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'deployment_update',
            deploymentId,
            update: log
          }));
        }
      }
    );
    
    ws.send(JSON.stringify({
      type: 'subscribed_to_deployment',
      deploymentId
    }));
  }

  // Broadcast message to all connected clients
  broadcast(message) {
    const messageStr = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Broadcast to specific deployment subscribers
  broadcastToDeployment(deploymentId, message) {
    const deployment = this.activeDeployments.get(deploymentId);
    if (deployment && deployment.ws.readyState === deployment.ws.OPEN) {
      deployment.ws.send(JSON.stringify(message));
    }
  }

  // Clean up completed deployments
  cleanupDeployments() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [id, deployment] of this.activeDeployments) {
      if (now - deployment.startTime > maxAge) {
        this.activeDeployments.delete(id);
      }
    }
  }
}

module.exports = DeploymentWebSocketHandler;