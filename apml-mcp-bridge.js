// APML-MCP Bridge - Maps APML agent capabilities to MCP tools
class APMLMCPBridge {
  constructor(agentRegistry, messageBroker, vfsHandler) {
    this.registry = agentRegistry;
    this.broker = messageBroker;
    this.vfs = vfsHandler;
    
    // Map of MCP tool names to agent capabilities
    this.toolMappings = new Map();
    
    // Initialize default mappings
    this.initializeDefaultMappings();
  }

  // Initialize default tool mappings
  initializeDefaultMappings() {
    // Core development tools
    this.addMapping('create_file', ['code_generation', 'file_operations']);
    this.addMapping('edit_file', ['code_editing', 'file_operations']);
    this.addMapping('search_code', ['code_analysis', 'search']);
    this.addMapping('run_tests', ['testing', 'code_execution']);
    
    // Design tools
    this.addMapping('create_component', ['ui_design', 'component_creation']);
    this.addMapping('design_layout', ['ui_design', 'layout']);
    this.addMapping('generate_styles', ['ui_design', 'styling']);
    
    // Architecture tools
    this.addMapping('design_api', ['api_design', 'architecture']);
    this.addMapping('create_schema', ['data_modeling', 'architecture']);
    this.addMapping('plan_architecture', ['architecture', 'planning']);
    
    // APML specific tools
    this.addMapping('create_apml_spec', ['apml_generation', 'specification']);
    this.addMapping('validate_apml', ['apml_validation', 'validation']);
    this.addMapping('compile_apml', ['apml_compilation', 'code_generation']);
  }

  // Add a tool mapping
  addMapping(toolName, requiredCapabilities) {
    this.toolMappings.set(toolName, requiredCapabilities);
  }

  // Get MCP tools list based on available agents
  getMCPTools() {
    const tools = [];
    
    for (const [toolName, capabilities] of this.toolMappings) {
      // Check if we have agents for this tool
      const agents = this.registry.findBestAgent(capabilities);
      
      if (agents) {
        tools.push({
          name: toolName,
          description: this.getToolDescription(toolName),
          inputSchema: this.getToolSchema(toolName),
          handler: agentId => agents.id // Return the agent that will handle this
        });
      }
    }
    
    // Add dynamic tools based on agent capabilities
    const allCapabilities = this.registry.getAllCapabilities();
    for (const { capability, agents } of allCapabilities) {
      if (agents.length > 0 && !this.isCapabilityMapped(capability)) {
        tools.push({
          name: `agent_${capability}`,
          description: `Invoke agents with ${capability} capability`,
          inputSchema: {
            type: 'object',
            properties: {
              task: { type: 'string', description: 'Task description' },
              context: { type: 'object', description: 'Additional context' }
            },
            required: ['task']
          }
        });
      }
    }
    
    return tools;
  }

  // Check if capability is already mapped
  isCapabilityMapped(capability) {
    for (const caps of this.toolMappings.values()) {
      if (caps.includes(capability)) return true;
    }
    return false;
  }

  // Handle MCP tool call
  async handleToolCall(toolName, args, mcpRequestId) {
    try {
      // Find agent to handle this tool
      const capabilities = this.toolMappings.get(toolName);
      let agent;
      
      if (capabilities) {
        agent = this.registry.findBestAgent(capabilities);
      } else if (toolName.startsWith('agent_')) {
        // Dynamic agent capability tool
        const capability = toolName.replace('agent_', '');
        const agents = this.registry.findAgentsByCapability(capability);
        agent = agents[0]; // Use first available
      }
      
      if (!agent) {
        return {
          error: `No agent available to handle tool: ${toolName}`
        };
      }

      // Create APML brief for the agent
      const brief = {
        mcpRequestId: mcpRequestId,
        tool: toolName,
        args: args,
        timestamp: new Date().toISOString()
      };

      // Send brief to agent
      const message = this.broker.sendBrief('mcp_bridge', agent.id, {
        type: 'mcp_tool_call',
        tool: toolName,
        args: args
      }, {
        expectedOutput: 'Execute tool and return results',
        priority: 'high',
        mcpRequestId: mcpRequestId
      });

      // Store request for tracking
      await this.vfs.writeFile(
        `mcp/requests/${mcpRequestId}.json`,
        JSON.stringify({
          tool: toolName,
          args: args,
          agent: agent.id,
          message: message,
          timestamp: new Date().toISOString()
        }, null, 2)
      );

      // Return async response indicator
      return {
        status: 'processing',
        agentId: agent.id,
        requestId: mcpRequestId
      };

    } catch (error) {
      console.error('MCP tool call error:', error);
      return {
        error: error.message
      };
    }
  }

  // Handle agent response for MCP
  async handleAgentResponse(agentId, report) {
    if (!report.context || !report.context.mcpRequestId) {
      return; // Not an MCP-related response
    }

    const mcpRequestId = report.context.mcpRequestId;

    try {
      // Format response for MCP
      const mcpResponse = {
        content: [{
          type: 'text',
          text: typeof report.results === 'string' 
            ? report.results 
            : JSON.stringify(report.results, null, 2)
        }]
      };

      // Store response
      await this.vfs.writeFile(
        `mcp/responses/${mcpRequestId}.json`,
        JSON.stringify({
          agentId: agentId,
          report: report,
          mcpResponse: mcpResponse,
          timestamp: new Date().toISOString()
        }, null, 2)
      );

      // Emit for MCP server to pick up
      this.broker.emit('mcp:response', {
        requestId: mcpRequestId,
        response: mcpResponse
      });

    } catch (error) {
      console.error('MCP response handling error:', error);
      
      // Emit error response
      this.broker.emit('mcp:response', {
        requestId: mcpRequestId,
        error: error.message
      });
    }
  }

  // Get tool description
  getToolDescription(toolName) {
    const descriptions = {
      create_file: 'Create a new file with specified content',
      edit_file: 'Edit an existing file',
      search_code: 'Search through codebase',
      run_tests: 'Run tests and return results',
      create_component: 'Create a UI component',
      design_layout: 'Design page layout',
      generate_styles: 'Generate CSS styles',
      design_api: 'Design API endpoints',
      create_schema: 'Create data schema',
      plan_architecture: 'Plan system architecture',
      create_apml_spec: 'Create APML specification',
      validate_apml: 'Validate APML syntax',
      compile_apml: 'Compile APML to implementation'
    };
    
    return descriptions[toolName] || `Execute ${toolName} operation`;
  }

  // Get tool input schema
  getToolSchema(toolName) {
    const schemas = {
      create_file: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'File content' },
          language: { type: 'string', description: 'Programming language' }
        },
        required: ['path', 'content']
      },
      edit_file: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          changes: { type: 'array', description: 'List of changes' }
        },
        required: ['path', 'changes']
      },
      search_code: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          fileTypes: { type: 'array', description: 'File types to search' }
        },
        required: ['query']
      },
      create_apml_spec: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'App description' },
          features: { type: 'array', description: 'List of features' }
        },
        required: ['description']
      }
    };
    
    return schemas[toolName] || {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Tool input' }
      },
      required: ['input']
    };
  }

  // Export MCP server configuration
  getMCPServerConfig() {
    return {
      name: 'ade-apml-bridge',
      version: '1.0.0',
      description: 'APML agent system exposed as MCP tools',
      tools: this.getMCPTools()
    };
  }
}

module.exports = APMLMCPBridge;