// APML App Visualizer
// Converts APML specifications into visual app flow diagrams

class APMLAppVisualizer {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.components = new Map();
    this.dataFlows = [];
  }

  // Main visualization method
  visualizeFromAPML(apmlMessages) {
    // Reset state
    this.nodes = [];
    this.edges = [];
    this.components.clear();
    this.dataFlows = [];

    // Process APML messages to extract app structure
    const appStructure = this.extractAppStructure(apmlMessages);
    
    // Create visualization data
    this.createScreenNodes(appStructure.screens);
    this.createNavigationEdges(appStructure.navigation);
    this.createComponentHierarchy(appStructure.components);
    this.createDataFlows(appStructure.dataModels);

    return {
      nodes: this.nodes,
      edges: this.edges,
      components: Array.from(this.components.values()),
      dataFlows: this.dataFlows,
      layout: this.generateLayout()
    };
  }

  // Extract app structure from APML messages
  extractAppStructure(apmlMessages) {
    const structure = {
      screens: [],
      navigation: {},
      components: {},
      dataModels: {},
      actions: []
    };

    apmlMessages.forEach(message => {
      if (message.type === 'handoff' && message.package) {
        // Extract screens
        Object.entries(message.package).forEach(([key, value]) => {
          if (value.layout || value.components) {
            structure.screens.push({
              id: key,
              ...value
            });
            
            // Extract navigation from screen
            if (value.navigation) {
              structure.navigation[key] = value.navigation;
            }
          }
        });

        // Extract data models
        if (message.package.data_models) {
          structure.dataModels = message.package.data_models;
        }
      }
    });

    return structure;
  }

  // Create screen nodes for visualization
  createScreenNodes(screens) {
    screens.forEach((screen, index) => {
      const node = {
        id: screen.id,
        label: this.formatScreenName(screen.id),
        type: 'screen',
        position: this.calculateScreenPosition(index, screens.length),
        data: {
          components: screen.components || [],
          layout: screen.layout || 'vertical',
          actions: this.extractActions(screen.components)
        },
        style: {
          background: '#1a1a26',
          border: '2px solid #00d4ff',
          borderRadius: '12px',
          padding: '20px',
          minWidth: '200px',
          minHeight: '150px'
        }
      };

      this.nodes.push(node);

      // Create component nodes within screen
      if (screen.components) {
        this.createComponentNodes(screen.id, screen.components);
      }
    });
  }

  // Create navigation edges
  createNavigationEdges(navigation) {
    Object.entries(navigation).forEach(([fromScreen, targets]) => {
      Object.entries(targets).forEach(([action, toScreen]) => {
        const edge = {
          id: `${fromScreen}-${action}-${toScreen}`,
          source: fromScreen,
          target: toScreen,
          label: this.formatActionName(action),
          type: 'navigation',
          animated: true,
          style: {
            stroke: '#00ff88',
            strokeWidth: 2
          },
          labelStyle: {
            fill: '#00ff88',
            fontWeight: 600
          }
        };
        this.edges.push(edge);
      });
    });
  }

  // Create component hierarchy
  createComponentNodes(screenId, components) {
    components.forEach((component, index) => {
      const componentNode = {
        id: `${screenId}-${component.id}`,
        parentId: screenId,
        label: component.type,
        type: 'component',
        data: component,
        position: {
          x: 20 + (index % 2) * 100,
          y: 50 + Math.floor(index / 2) * 60
        },
        style: this.getComponentStyle(component.type)
      };

      this.components.set(componentNode.id, componentNode);

      // Handle nested components
      if (component.components) {
        this.createComponentNodes(`${screenId}-${component.id}`, component.components);
      }
    });
  }

  // Create data flow visualization
  createDataFlows(dataModels) {
    Object.entries(dataModels).forEach(([modelName, model]) => {
      const dataNode = {
        id: `data-${modelName}`,
        label: modelName,
        type: 'dataModel',
        position: this.calculateDataPosition(modelName),
        data: model,
        style: {
          background: '#2a1a4a',
          border: '2px solid #7c3aed',
          borderRadius: '8px',
          padding: '15px'
        }
      };

      this.nodes.push(dataNode);

      // Create edges for data relationships
      if (model.fields) {
        Object.entries(model.fields).forEach(([field, type]) => {
          if (type.includes('foreign') || type.includes('relation')) {
            // Extract related model
            const relatedModel = this.extractRelatedModel(type);
            if (relatedModel) {
              this.edges.push({
                id: `${modelName}-${field}-${relatedModel}`,
                source: `data-${modelName}`,
                target: `data-${relatedModel}`,
                label: field,
                type: 'dataRelation',
                style: {
                  stroke: '#7c3aed',
                  strokeDasharray: '5,5'
                }
              });
            }
          }
        });
      }
    });
  }

  // Generate optimal layout for visualization
  generateLayout() {
    return {
      type: 'hierarchical',
      direction: 'LR', // Left to right
      spacing: {
        nodeDistance: 250,
        levelDistance: 200
      },
      screenLayout: {
        type: 'grid',
        columns: 3
      },
      dataModelLayout: {
        type: 'circular',
        radius: 300
      }
    };
  }

  // Helper methods
  formatScreenName(screenId) {
    return screenId.replace('Screen', '').replace(/([A-Z])/g, ' $1').trim();
  }

  formatActionName(action) {
    return action.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  }

  calculateScreenPosition(index, total) {
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    return {
      x: 100 + col * 300,
      y: 100 + row * 250
    };
  }

  calculateDataPosition(modelName) {
    // Position data models in a separate area
    const hash = modelName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const angle = (hash % 360) * Math.PI / 180;
    const radius = 400;
    
    return {
      x: 800 + Math.cos(angle) * radius,
      y: 400 + Math.sin(angle) * radius
    };
  }

  extractActions(components) {
    const actions = [];
    
    components?.forEach(comp => {
      if (comp.props?.action) {
        actions.push({
          type: comp.type,
          action: comp.props.action,
          trigger: comp.props.trigger || 'click'
        });
      }
      
      // Recurse for nested components
      if (comp.components) {
        actions.push(...this.extractActions(comp.components));
      }
    });
    
    return actions;
  }

  extractRelatedModel(fieldType) {
    const match = fieldType.match(/foreign:(\w+)|belongsTo:(\w+)|hasOne:(\w+)/);
    return match ? (match[1] || match[2] || match[3]) : null;
  }

  getComponentStyle(componentType) {
    const styles = {
      'Button': {
        background: '#007AFF',
        color: 'white',
        borderRadius: '6px',
        padding: '8px 16px'
      },
      'TextInput': {
        background: '#2a2a3a',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '8px'
      },
      'List': {
        background: '#1a1a2a',
        border: '1px solid #333',
        borderRadius: '4px',
        padding: '10px'
      },
      'Header': {
        background: '#0a0a1a',
        borderBottom: '2px solid #00d4ff',
        padding: '10px',
        fontWeight: 'bold'
      }
    };

    return styles[componentType] || {
      background: '#2a2a2a',
      border: '1px solid #444',
      borderRadius: '4px',
      padding: '8px'
    };
  }

  // Generate Mermaid diagram for simple visualization
  generateMermaidDiagram(screens, navigation) {
    let diagram = 'graph LR\n';
    
    // Add screens
    screens.forEach(screen => {
      diagram += `    ${screen.id}[${this.formatScreenName(screen.id)}]\n`;
    });
    
    // Add navigation
    Object.entries(navigation).forEach(([from, targets]) => {
      Object.entries(targets).forEach(([action, to]) => {
        diagram += `    ${from} -->|${action}| ${to}\n`;
      });
    });
    
    return diagram;
  }

  // Generate component tree for a screen
  generateComponentTree(components, level = 0) {
    const indent = '  '.repeat(level);
    let tree = '';
    
    components?.forEach(comp => {
      tree += `${indent}├─ ${comp.type}`;
      if (comp.props?.text || comp.props?.placeholder) {
        tree += ` (${comp.props.text || comp.props.placeholder})`;
      }
      tree += '\n';
      
      if (comp.components) {
        tree += this.generateComponentTree(comp.components, level + 1);
      }
    });
    
    return tree;
  }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APMLAppVisualizer;
}