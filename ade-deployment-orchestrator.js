// ADE Deployment Orchestrator
// Coordinates the flow from APML → Code Generation → Deployment

const APMLCodeGenerator = require('./apml-code-generator');
const DeploymentPipeline = require('./deployment-pipeline');
const EventEmitter = require('events');

class ADEDeploymentOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.codeGenerator = new APMLCodeGenerator();
    this.deploymentPipeline = new DeploymentPipeline(config);
    this.activeDeployments = new Map();
  }

  // Main orchestration method
  async deployFromAPML(apmlMessages, options = {}) {
    const deploymentId = `ade-${Date.now()}`;
    
    try {
      this.emit('deployment:started', { deploymentId });
      
      // Track deployment
      this.activeDeployments.set(deploymentId, {
        status: 'initializing',
        startTime: Date.now(),
        apmlMessages
      });

      // Step 1: Parse APML to extract project info
      const projectInfo = this.extractProjectInfo(apmlMessages);
      this.updateDeploymentStatus(deploymentId, 'generating_code');
      
      // Step 2: Generate code from APML
      this.emit('code:generating', { deploymentId, projectInfo });
      const generatedFiles = await this.codeGenerator.generateFromAPML(
        apmlMessages,
        options.platform || 'react-web'
      );
      
      this.emit('code:generated', { 
        deploymentId, 
        fileCount: generatedFiles.size 
      });
      
      // Step 3: Validate generated code
      this.updateDeploymentStatus(deploymentId, 'validating');
      await this.validateGeneratedCode(generatedFiles);
      
      // Step 4: Deploy to Railway
      this.updateDeploymentStatus(deploymentId, 'deploying');
      this.emit('deployment:uploading', { deploymentId });
      
      const deploymentResult = await this.deploymentPipeline.deployToRailway(
        projectInfo.name,
        generatedFiles,
        {
          env: options.env,
          ...projectInfo.deploymentConfig
        }
      );
      
      // Step 5: Post-deployment tasks
      this.updateDeploymentStatus(deploymentId, 'finalizing');
      await this.performPostDeploymentTasks(deploymentResult, projectInfo);
      
      // Complete
      this.updateDeploymentStatus(deploymentId, 'completed');
      this.emit('deployment:completed', {
        deploymentId,
        result: deploymentResult,
        duration: Date.now() - this.activeDeployments.get(deploymentId).startTime
      });
      
      return {
        success: true,
        deploymentId,
        projectInfo,
        deployment: deploymentResult
      };
      
    } catch (error) {
      this.updateDeploymentStatus(deploymentId, 'failed');
      this.emit('deployment:failed', {
        deploymentId,
        error: error.message
      });
      
      throw error;
    }
  }

  // Extract project information from APML messages
  extractProjectInfo(apmlMessages) {
    const briefMessage = apmlMessages.find(msg => msg.type === 'brief');
    const deployMessage = apmlMessages.find(msg => 
      msg.type === 'brief' && msg.deployment
    );
    
    if (!briefMessage?.project) {
      throw new Error('No project brief found in APML messages');
    }
    
    return {
      name: briefMessage.project.name,
      description: briefMessage.project.description,
      platform: briefMessage.project.platform || 'mobile-first-web',
      deploymentConfig: deployMessage?.deployment || {},
      requirements: briefMessage.requirements || {}
    };
  }

  // Validate generated code
  async validateGeneratedCode(generatedFiles) {
    const requiredFiles = [
      'package.json',
      'src/App.js',
      'src/navigation/Router.js'
    ];
    
    for (const file of requiredFiles) {
      if (!generatedFiles.has(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    // Validate package.json
    const packageJson = generatedFiles.get('package.json');
    try {
      const parsed = JSON.parse(packageJson);
      if (!parsed.name || !parsed.scripts?.build) {
        throw new Error('Invalid package.json structure');
      }
    } catch (error) {
      throw new Error(`Invalid package.json: ${error.message}`);
    }
    
    this.emit('validation:passed', { fileCount: generatedFiles.size });
  }

  // Perform post-deployment tasks
  async performPostDeploymentTasks(deploymentResult, projectInfo) {
    const tasks = [];
    
    // Create deployment summary
    const summary = {
      projectName: projectInfo.name,
      deployedAt: new Date().toISOString(),
      urls: deploymentResult.urls,
      platform: projectInfo.platform,
      features: projectInfo.requirements.functional || []
    };
    
    // Store deployment info
    this.emit('deployment:summary', summary);
    
    // Set up monitoring (placeholder)
    tasks.push(this.setupMonitoring(deploymentResult.deployment.deploymentId));
    
    // Configure custom domain if provided
    if (projectInfo.deploymentConfig.domain) {
      tasks.push(this.configureDomain(
        deploymentResult.deployment.projectId,
        projectInfo.deploymentConfig.domain
      ));
    }
    
    await Promise.all(tasks);
  }

  // Set up monitoring
  async setupMonitoring(deploymentId) {
    // Placeholder for monitoring setup
    // Could integrate with services like Sentry, LogRocket, etc.
    console.log(`Monitoring configured for deployment: ${deploymentId}`);
  }

  // Configure custom domain
  async configureDomain(projectId, domain) {
    // Placeholder for domain configuration
    console.log(`Domain ${domain} configured for project: ${projectId}`);
  }

  // Update deployment status
  updateDeploymentStatus(deploymentId, status) {
    const deployment = this.activeDeployments.get(deploymentId);
    if (deployment) {
      deployment.status = status;
      deployment.lastUpdated = Date.now();
      
      this.emit('deployment:status', {
        deploymentId,
        status,
        duration: Date.now() - deployment.startTime
      });
    }
  }

  // Get deployment status
  getDeploymentStatus(deploymentId) {
    return this.activeDeployments.get(deploymentId) || null;
  }

  // Stream deployment logs
  streamDeploymentLogs(deploymentId, callback) {
    this.on('deployment:status', (data) => {
      if (data.deploymentId === deploymentId) {
        callback({
          type: 'status',
          timestamp: new Date().toISOString(),
          ...data
        });
      }
    });
    
    this.on('deployment:log', (data) => {
      if (data.deploymentId === deploymentId) {
        callback({
          type: 'log',
          timestamp: new Date().toISOString(),
          ...data
        });
      }
    });
  }

  // Quick deploy - simplified flow for demos
  async quickDeploy(userDescription, options = {}) {
    this.emit('quickdeploy:started', { description: userDescription });
    
    // Generate APML from description
    const apmlMessages = await this.generateAPMLFromDescription(userDescription);
    
    // Deploy
    return this.deployFromAPML(apmlMessages, options);
  }

  // Generate APML from user description (simplified)
  async generateAPMLFromDescription(description) {
    // This would normally call the APML shaping system
    // For now, return a basic structure
    
    const projectName = this.extractProjectName(description);
    const features = this.extractFeatures(description);
    
    return [
      {
        type: 'brief',
        id: `brief-${Date.now()}`,
        from: 'User',
        to: 'L1_ORCH',
        project: {
          name: projectName,
          description: description,
          platform: 'mobile-first-web'
        },
        requirements: {
          functional: features
        }
      },
      {
        type: 'handoff',
        id: `handoff-${Date.now()}`,
        from: 'L2_AppArchitect',
        to: 'L3_Implementation',
        package: {
          LoginScreen: {
            layout: 'vertical',
            components: [
              {
                id: 'email-input',
                type: 'TextInput',
                props: {
                  placeholder: 'Email',
                  type: 'email'
                }
              },
              {
                id: 'login-button',
                type: 'Button',
                props: {
                  text: 'Sign In',
                  action: 'authenticate'
                }
              }
            ]
          }
        }
      }
    ];
  }

  // Extract project name from description
  extractProjectName(description) {
    const words = description.toLowerCase().split(' ');
    
    if (words.includes('todo') || words.includes('task')) {
      return 'SmartTodo';
    }
    if (words.includes('chat') || words.includes('message')) {
      return 'ChatConnect';
    }
    if (words.includes('shop') || words.includes('store')) {
      return 'QuickShop';
    }
    
    return 'MyApp';
  }

  // Extract features from description
  extractFeatures(description) {
    const features = [];
    const lower = description.toLowerCase();
    
    if (lower.includes('login') || lower.includes('auth')) {
      features.push('User authentication');
    }
    if (lower.includes('task') || lower.includes('todo')) {
      features.push('Task management');
    }
    if (lower.includes('chat') || lower.includes('message')) {
      features.push('Real-time messaging');
    }
    if (lower.includes('photo') || lower.includes('image')) {
      features.push('Photo sharing');
    }
    
    return features;
  }
}

// Export for use in ADE system
module.exports = ADEDeploymentOrchestrator;

// Example usage
if (require.main === module) {
  const orchestrator = new ADEDeploymentOrchestrator({
    tempDir: '/tmp/ade-deployments'
  });
  
  // Subscribe to events
  orchestrator.on('deployment:started', (data) => {
    console.log('🚀 Deployment started:', data.deploymentId);
  });
  
  orchestrator.on('code:generated', (data) => {
    console.log('📝 Code generated:', data.fileCount, 'files');
  });
  
  orchestrator.on('deployment:completed', (data) => {
    console.log('✅ Deployment completed!');
    console.log('🌐 App URL:', data.result.urls.app);
    console.log('⏱️ Duration:', data.duration, 'ms');
  });
  
  // Example: Quick deploy from description
  (async () => {
    try {
      const result = await orchestrator.quickDeploy(
        'I need a todo app with user authentication and categories'
      );
      
      console.log('Deployment successful:', result);
    } catch (error) {
      console.error('Deployment failed:', error);
    }
  })();
}