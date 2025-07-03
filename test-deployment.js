// Test script for ADE Deployment Pipeline
// Run with: node test-deployment.js

const fs = require('fs').promises;
const path = require('path');
const ADEDeploymentOrchestrator = require('./ade-deployment-orchestrator');

// Load example APML
async function loadExampleAPML() {
  try {
    const apmlContent = await fs.readFile(
      path.join(__dirname, 'EXAMPLE-TODO-APP.apml'),
      'utf8'
    );
    
    // Parse APML messages from the file
    const apmlMessages = [];
    const codeBlocks = apmlContent.match(/```apml\n([\s\S]*?)```/g);
    
    if (codeBlocks) {
      codeBlocks.forEach(block => {
        const json = block.replace(/```apml\n/, '').replace(/```/, '');
        try {
          apmlMessages.push(JSON.parse(json));
        } catch (e) {
          console.error('Failed to parse APML block:', e);
        }
      });
    }
    
    return apmlMessages;
  } catch (error) {
    console.error('Failed to load example APML:', error);
    
    // Return minimal example if file not found
    return [
      {
        type: 'brief',
        id: 'test-brief-001',
        from: 'User',
        to: 'L1_ORCH',
        project: {
          name: 'TestTodoApp',
          description: 'A simple todo app for testing deployment',
          platform: 'mobile-first-web'
        },
        requirements: {
          functional: [
            'User can create and delete tasks',
            'Tasks persist between sessions',
            'Mobile-friendly interface'
          ]
        }
      },
      {
        type: 'handoff',
        id: 'test-handoff-001',
        from: 'L2_AppArchitect',
        to: 'L3_Implementation',
        package: {
          TaskListScreen: {
            layout: 'vertical',
            components: [
              {
                id: 'header',
                type: 'Header',
                props: {
                  title: 'My Tasks'
                }
              },
              {
                id: 'task-list',
                type: 'List',
                props: {
                  itemComponent: 'TaskCard',
                  data: '${tasks}',
                  emptyMessage: 'No tasks yet!'
                }
              },
              {
                id: 'add-button',
                type: 'Button',
                props: {
                  text: 'Add Task',
                  action: 'navigateToCreateTask',
                  style: 'primary'
                }
              }
            ]
          }
        }
      }
    ];
  }
}

// Test deployment
async function testDeployment() {
  console.log('🚀 Starting ADE Deployment Pipeline Test\n');
  
  // Check for required environment variables
  const requiredEnvVars = ['RAILWAY_TOKEN', 'GITHUB_TOKEN'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease set these in your .env file. See deployment-setup.md for instructions.\n');
    process.exit(1);
  }
  
  // Create orchestrator
  const orchestrator = new ADEDeploymentOrchestrator({
    tempDir: '/tmp/ade-test-deployments'
  });
  
  // Set up event listeners
  orchestrator.on('deployment:started', ({ deploymentId }) => {
    console.log(`📋 Deployment ID: ${deploymentId}`);
  });
  
  orchestrator.on('code:generating', ({ projectInfo }) => {
    console.log(`📝 Generating code for: ${projectInfo.name}`);
  });
  
  orchestrator.on('code:generated', ({ fileCount }) => {
    console.log(`✅ Generated ${fileCount} files`);
  });
  
  orchestrator.on('validation:passed', () => {
    console.log('✅ Code validation passed');
  });
  
  orchestrator.on('deployment:uploading', () => {
    console.log('📤 Uploading to Railway...');
  });
  
  orchestrator.on('deployment:status', ({ status }) => {
    console.log(`📊 Status: ${status}`);
  });
  
  orchestrator.on('deployment:completed', ({ result, duration }) => {
    console.log('\n🎉 Deployment Successful!\n');
    console.log(`🌐 App URL: ${result.urls.app}`);
    console.log(`📁 GitHub: ${result.urls.github}`);
    console.log(`🚂 Railway: ${result.urls.railway}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s\n`);
  });
  
  orchestrator.on('deployment:failed', ({ error }) => {
    console.error('\n❌ Deployment Failed:', error);
  });
  
  try {
    // Load example APML
    console.log('📄 Loading example APML specification...');
    const apmlMessages = await loadExampleAPML();
    console.log(`✅ Loaded ${apmlMessages.length} APML messages\n`);
    
    // Test deployment options
    const options = {
      platform: 'react-web',
      env: {
        REACT_APP_API_URL: 'https://api.example.com',
        REACT_APP_ENV: 'production'
      }
    };
    
    // Start deployment
    console.log('🚀 Starting deployment process...\n');
    const result = await orchestrator.deployFromAPML(apmlMessages, options);
    
    console.log('✨ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Quick deploy test
async function testQuickDeploy() {
  console.log('🚀 Testing Quick Deploy\n');
  
  const orchestrator = new ADEDeploymentOrchestrator();
  
  orchestrator.on('quickdeploy:started', ({ description }) => {
    console.log(`📝 Processing: "${description}"`);
  });
  
  try {
    const result = await orchestrator.quickDeploy(
      'I need a simple todo app with task management and categories'
    );
    
    console.log('\n✅ Quick deploy successful!');
    console.log('🌐 App URL:', result.deployment.urls.app);
    
  } catch (error) {
    console.error('❌ Quick deploy failed:', error.message);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'quick':
    testQuickDeploy();
    break;
  case 'full':
  default:
    testDeployment();
    break;
}

// Usage instructions
if (command === 'help') {
  console.log(`
ADE Deployment Pipeline Test

Usage:
  node test-deployment.js [command]

Commands:
  full    Test full deployment with APML (default)
  quick   Test quick deployment from description
  help    Show this help message

Environment variables required:
  RAILWAY_TOKEN    Your Railway API token
  GITHUB_TOKEN     Your GitHub personal access token

See deployment-setup.md for detailed setup instructions.
`);
  process.exit(0);
}