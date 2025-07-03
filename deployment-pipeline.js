// ADE Deployment Pipeline
// Handles automatic deployment of generated apps to Railway

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const axios = require('axios');
const FormData = require('form-data');
const archiver = require('archiver');
const stream = require('stream');
const { pipeline } = require('stream/promises');

class DeploymentPipeline {
  constructor(config = {}) {
    this.railwayApiUrl = 'https://api.railway.app/graphql/v2';
    this.railwayToken = process.env.RAILWAY_TOKEN;
    this.githubToken = process.env.GITHUB_TOKEN;
    this.tempDir = config.tempDir || '/tmp/ade-deployments';
    this.deploymentsInProgress = new Map();
  }

  // Main deployment entry point
  async deployToRailway(projectName, generatedFiles, options = {}) {
    const deploymentId = `deploy-${Date.now()}`;
    
    try {
      console.log(`Starting deployment for ${projectName}...`);
      
      this.deploymentsInProgress.set(deploymentId, {
        projectName,
        status: 'preparing',
        startTime: Date.now()
      });

      // Step 1: Prepare project directory
      const projectPath = await this.prepareProjectDirectory(projectName, generatedFiles);
      
      // Step 2: Initialize git repository
      await this.initializeGitRepo(projectPath);
      
      // Step 3: Create GitHub repository
      const githubRepo = await this.createGitHubRepo(projectName);
      
      // Step 4: Push to GitHub
      await this.pushToGitHub(projectPath, githubRepo);
      
      // Step 5: Deploy to Railway
      const deployment = await this.deployViaRailway(projectName, githubRepo, options);
      
      // Step 6: Configure environment
      await this.configureEnvironment(deployment.projectId, options.env || {});
      
      // Step 7: Wait for deployment to complete
      const result = await this.waitForDeployment(deployment.deploymentId);
      
      this.deploymentsInProgress.delete(deploymentId);
      
      return {
        success: true,
        deploymentId,
        urls: {
          app: result.url,
          github: githubRepo.html_url,
          railway: `https://railway.app/project/${deployment.projectId}`
        },
        deployment: result
      };
      
    } catch (error) {
      this.deploymentsInProgress.delete(deploymentId);
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  // Prepare project directory with generated files
  async prepareProjectDirectory(projectName, generatedFiles) {
    const projectPath = path.join(this.tempDir, projectName);
    
    // Create project directory
    await fs.mkdir(projectPath, { recursive: true });
    
    // Write all generated files
    for (const [filePath, content] of generatedFiles) {
      const fullPath = path.join(projectPath, filePath);
      const dir = path.dirname(fullPath);
      
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }
    
    // Add Railway configuration
    await this.addRailwayConfig(projectPath, projectName);
    
    // Add deployment scripts
    await this.addDeploymentScripts(projectPath);
    
    return projectPath;
  }

  // Add Railway-specific configuration
  async addRailwayConfig(projectPath, projectName) {
    const railwayConfig = {
      build: {
        builder: 'NIXPACKS',
        buildCommand: 'npm install && npm run build'
      },
      deploy: {
        startCommand: 'npm start',
        restartPolicyType: 'ON_FAILURE',
        restartPolicyMaxRetries: 10
      }
    };
    
    await fs.writeFile(
      path.join(projectPath, 'railway.json'),
      JSON.stringify(railwayConfig, null, 2)
    );
    
    // Add nixpacks configuration for better build control
    const nixpacksConfig = `
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[phases.install]
cmds = ["npm ci --production=false"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
`;
    
    await fs.writeFile(
      path.join(projectPath, 'nixpacks.toml'),
      nixpacksConfig.trim()
    );
  }

  // Add deployment helper scripts
  async addDeploymentScripts(projectPath) {
    // Add server.js for static sites
    const serverScript = `
const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression
app.use(compression());

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

    await fs.writeFile(
      path.join(projectPath, 'server.js'),
      serverScript.trim()
    );
    
    // Update package.json to include server dependencies
    const packagePath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
    
    // Add production dependencies
    packageJson.dependencies = {
      ...packageJson.dependencies,
      'express': '^4.18.2',
      'compression': '^1.7.4'
    };
    
    // Update scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'start': 'node server.js',
      'start:dev': 'react-scripts start'
    };
    
    await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
  }

  // Initialize git repository
  async initializeGitRepo(projectPath) {
    const gitCommands = [
      'git init',
      'git add .',
      'git commit -m "Initial commit - Generated by ADE"'
    ];
    
    for (const cmd of gitCommands) {
      await execAsync(cmd, { cwd: projectPath });
    }
  }

  // Create GitHub repository
  async createGitHubRepo(projectName) {
    const repoName = projectName.toLowerCase().replace(/\s+/g, '-');
    
    try {
      const response = await axios.post(
        'https://api.github.com/user/repos',
        {
          name: repoName,
          description: `${projectName} - Built with ADE`,
          private: false,
          auto_init: false
        },
        {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 422) {
        // Repository already exists, try with timestamp
        const uniqueName = `${repoName}-${Date.now()}`;
        return this.createGitHubRepo(uniqueName);
      }
      throw error;
    }
  }

  // Push code to GitHub
  async pushToGitHub(projectPath, githubRepo) {
    const commands = [
      `git remote add origin ${githubRepo.clone_url}`,
      'git branch -M main',
      'git push -u origin main'
    ];
    
    for (const cmd of commands) {
      await execAsync(cmd, { cwd: projectPath });
    }
  }

  // Deploy via Railway API
  async deployViaRailway(projectName, githubRepo, options) {
    // Create Railway project
    const createProjectQuery = `
      mutation CreateProject($name: String!) {
        projectCreate(input: { name: $name }) {
          project {
            id
            name
          }
        }
      }
    `;
    
    const projectResponse = await this.railwayGraphQL(createProjectQuery, {
      name: projectName
    });
    
    const projectId = projectResponse.data.projectCreate.project.id;
    
    // Connect GitHub repository
    const connectGitHubQuery = `
      mutation ConnectGitHub($projectId: String!, $repo: String!) {
        githubRepoConnect(input: {
          projectId: $projectId,
          repo: $repo,
          branch: "main"
        }) {
          success
        }
      }
    `;
    
    await this.railwayGraphQL(connectGitHubQuery, {
      projectId,
      repo: `${githubRepo.owner.login}/${githubRepo.name}`
    });
    
    // Trigger deployment
    const deployQuery = `
      mutation TriggerDeployment($projectId: String!) {
        deploymentTrigger(projectId: $projectId) {
          deployment {
            id
            status
          }
        }
      }
    `;
    
    const deployResponse = await this.railwayGraphQL(deployQuery, {
      projectId
    });
    
    return {
      projectId,
      deploymentId: deployResponse.data.deploymentTrigger.deployment.id
    };
  }

  // Configure environment variables
  async configureEnvironment(projectId, envVars) {
    const setEnvQuery = `
      mutation SetEnvironmentVariables($projectId: String!, $variables: JSON!) {
        variableCollectionUpsert(input: {
          projectId: $projectId,
          variables: $variables
        }) {
          success
        }
      }
    `;
    
    const variables = {
      ...envVars,
      NODE_ENV: 'production',
      REACT_APP_ENV: 'production',
      REACT_APP_API_URL: envVars.API_URL || 'https://api.example.com'
    };
    
    await this.railwayGraphQL(setEnvQuery, {
      projectId,
      variables
    });
  }

  // Wait for deployment to complete
  async waitForDeployment(deploymentId, maxWaitTime = 600000) {
    const startTime = Date.now();
    const checkInterval = 5000;
    
    while (Date.now() - startTime < maxWaitTime) {
      const statusQuery = `
        query GetDeploymentStatus($deploymentId: String!) {
          deployment(id: $deploymentId) {
            id
            status
            url
            error
          }
        }
      `;
      
      const response = await this.railwayGraphQL(statusQuery, {
        deploymentId
      });
      
      const deployment = response.data.deployment;
      
      if (deployment.status === 'SUCCESS') {
        return {
          status: 'success',
          url: deployment.url,
          deploymentId
        };
      }
      
      if (deployment.status === 'FAILED') {
        throw new Error(`Deployment failed: ${deployment.error}`);
      }
      
      console.log(`Deployment status: ${deployment.status}`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error('Deployment timeout');
  }

  // Railway GraphQL helper
  async railwayGraphQL(query, variables = {}) {
    const response = await axios.post(
      this.railwayApiUrl,
      {
        query,
        variables
      },
      {
        headers: {
          'Authorization': `Bearer ${this.railwayToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.errors) {
      throw new Error(`Railway API error: ${JSON.stringify(response.data.errors)}`);
    }
    
    return response.data;
  }

  // Alternative: Direct deployment without GitHub
  async deployDirectly(projectName, generatedFiles, options = {}) {
    console.log('Starting direct deployment to Railway...');
    
    try {
      // Prepare deployment package
      const deploymentPackage = await this.createDeploymentPackage(
        projectName,
        generatedFiles
      );
      
      // Upload to Railway
      const deployment = await this.uploadToRailway(
        projectName,
        deploymentPackage,
        options
      );
      
      // Wait for deployment
      const result = await this.waitForDeployment(deployment.deploymentId);
      
      return {
        success: true,
        urls: {
          app: result.url,
          railway: `https://railway.app/project/${deployment.projectId}`
        },
        deployment: result
      };
      
    } catch (error) {
      console.error('Direct deployment failed:', error);
      throw error;
    }
  }

  // Create deployment package (zip)
  async createDeploymentPackage(projectName, generatedFiles) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    
    archive.on('data', chunk => chunks.push(chunk));
    
    // Add all files to archive
    for (const [filePath, content] of generatedFiles) {
      archive.append(content, { name: filePath });
    }
    
    // Add Railway config
    const railwayConfig = {
      build: {
        builder: 'NIXPACKS',
        buildCommand: 'npm install && npm run build'
      },
      deploy: {
        startCommand: 'npm start'
      }
    };
    
    archive.append(
      JSON.stringify(railwayConfig, null, 2),
      { name: 'railway.json' }
    );
    
    await archive.finalize();
    
    return Buffer.concat(chunks);
  }

  // Upload package to Railway
  async uploadToRailway(projectName, deploymentPackage, options) {
    // This would require Railway's direct upload API
    // Currently Railway primarily works through GitHub integration
    // This is a placeholder for future direct upload support
    
    throw new Error(
      'Direct upload not yet supported. Please use GitHub integration.'
    );
  }

  // Get deployment status
  async getDeploymentStatus(deploymentId) {
    const deployment = this.deploymentsInProgress.get(deploymentId);
    if (!deployment) {
      return { status: 'not_found' };
    }
    
    return {
      ...deployment,
      duration: Date.now() - deployment.startTime
    };
  }

  // Clean up temporary files
  async cleanup(projectName) {
    const projectPath = path.join(this.tempDir, projectName);
    try {
      await fs.rm(projectPath, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

module.exports = DeploymentPipeline;