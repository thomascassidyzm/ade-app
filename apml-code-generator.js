// APML to Code Generator
// Converts APML specifications into deployable code

class APMLCodeGenerator {
  constructor() {
    this.supportedPlatforms = ['react-web', 'react-native', 'vue-web', 'flutter'];
    this.generatedFiles = new Map();
  }

  // Main generation entry point
  async generateFromAPML(apmlSpec, platform = 'react-web') {
    console.log(`Generating ${platform} code from APML...`);
    
    this.generatedFiles.clear();
    
    // Parse APML messages to build complete spec
    const completeSpec = this.parseAPMLMessages(apmlSpec);
    
    // Generate based on platform
    switch (platform) {
      case 'react-web':
        await this.generateReactWeb(completeSpec);
        break;
      case 'react-native':
        await this.generateReactNative(completeSpec);
        break;
      case 'vue-web':
        await this.generateVueWeb(completeSpec);
        break;
      default:
        throw new Error(`Platform ${platform} not supported`);
    }
    
    return this.generatedFiles;
  }

  // Parse APML messages into unified spec
  parseAPMLMessages(apmlMessages) {
    const spec = {
      project: {},
      screens: new Map(),
      components: new Map(),
      dataModels: new Map(),
      api: {},
      navigation: {}
    };

    // Process each message type
    apmlMessages.forEach(message => {
      switch (message.type) {
        case 'brief':
          spec.project = message.project;
          break;
        case 'handoff':
          if (message.package) {
            // Extract screens
            Object.entries(message.package).forEach(([key, value]) => {
              if (value.layout) {
                spec.screens.set(key, value);
              }
            });
            // Extract data models
            if (message.package.data_models) {
              Object.entries(message.package.data_models).forEach(([name, model]) => {
                spec.dataModels.set(name, model);
              });
            }
            // Extract API
            if (message.package.api) {
              spec.api = message.package.api;
            }
          }
          break;
      }
    });

    return spec;
  }

  // Generate React Web Application
  async generateReactWeb(spec) {
    // Package.json
    this.generatedFiles.set('package.json', this.generatePackageJson(spec, 'react-web'));
    
    // App.js
    this.generatedFiles.set('src/App.js', this.generateReactApp(spec));
    
    // Generate screens
    spec.screens.forEach((screen, name) => {
      const screenCode = this.generateReactScreen(name, screen);
      this.generatedFiles.set(`src/screens/${name}.js`, screenCode);
    });
    
    // Generate components
    const components = this.extractComponents(spec.screens);
    components.forEach((component, name) => {
      const componentCode = this.generateReactComponent(name, component);
      this.generatedFiles.set(`src/components/${name}.js`, componentCode);
    });
    
    // API service
    if (spec.api.endpoints) {
      this.generatedFiles.set('src/services/api.js', this.generateAPIService(spec.api));
    }
    
    // Data models
    if (spec.dataModels.size > 0) {
      this.generatedFiles.set('src/models/index.js', this.generateDataModels(spec.dataModels));
    }
    
    // Navigation
    this.generatedFiles.set('src/navigation/Router.js', this.generateReactRouter(spec));
    
    // Styles
    this.generatedFiles.set('src/styles/global.css', this.generateGlobalStyles());
  }

  // Generate package.json
  generatePackageJson(spec, platform) {
    const packages = {
      'react-web': {
        name: spec.project.name?.toLowerCase().replace(/\s/g, '-') || 'app',
        version: '1.0.0',
        scripts: {
          start: 'react-scripts start',
          build: 'react-scripts build',
          test: 'react-scripts test',
          eject: 'react-scripts eject'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'react-router-dom': '^6.8.0',
          'axios': '^1.3.0'
        },
        devDependencies: {
          'react-scripts': '5.0.1'
        }
      }
    };

    return JSON.stringify(packages[platform], null, 2);
  }

  // Generate main React App
  generateReactApp(spec) {
    return `import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Router from './navigation/Router';
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Router />
      </div>
    </BrowserRouter>
  );
}

export default App;`;
  }

  // Generate React Screen
  generateReactScreen(name, screen) {
    const imports = this.generateScreenImports(screen);
    const state = this.generateScreenState(screen);
    const methods = this.generateScreenMethods(screen);
    const render = this.generateScreenRender(name, screen);

    return `import React, { useState, useEffect } from 'react';
${imports}

function ${name}() {
${state}
${methods}

  return (
    <div className="${name.toLowerCase()}-screen screen">
${render}
    </div>
  );
}

export default ${name};`;
  }

  // Generate screen imports
  generateScreenImports(screen) {
    const imports = new Set();
    
    // Add component imports
    screen.components?.forEach(comp => {
      if (comp.type && comp.type !== 'Container') {
        imports.add(`import ${comp.type} from '../components/${comp.type}';`);
      }
    });
    
    // Add navigation
    imports.add(`import { useNavigate } from 'react-router-dom';`);
    
    // Add API if needed
    if (screen.data?.source === 'api') {
      imports.add(`import { api } from '../services/api';`);
    }
    
    return Array.from(imports).join('\n');
  }

  // Generate screen state
  generateScreenState(screen) {
    const states = [];
    
    // Navigation
    states.push('  const navigate = useNavigate();');
    
    // Data state
    if (screen.data) {
      states.push('  const [data, setData] = useState(null);');
      states.push('  const [loading, setLoading] = useState(false);');
    }
    
    // Component states
    screen.components?.forEach(comp => {
      if (comp.type === 'TextInput') {
        states.push(`  const [${comp.id.replace('-', '_')}, set${this.capitalize(comp.id.replace('-', '_'))}] = useState('');`);
      }
    });
    
    return states.join('\n');
  }

  // Generate screen methods
  generateScreenMethods(screen) {
    const methods = [];
    
    // Data fetching
    if (screen.data?.source === 'api') {
      methods.push(`
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('${screen.data.endpoint}');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };`);
    }
    
    // Navigation methods
    if (screen.navigation) {
      Object.entries(screen.navigation).forEach(([event, target]) => {
        methods.push(`
  const handle${this.capitalize(event)} = () => {
    navigate('/${target.toLowerCase()}');
  };`);
      });
    }
    
    return methods.join('\n');
  }

  // Generate screen render
  generateScreenRender(name, screen) {
    const components = [];
    
    screen.components?.forEach(comp => {
      components.push(this.renderComponent(comp, 3));
    });
    
    return components.join('\n');
  }

  // Render individual component
  renderComponent(component, indent = 0) {
    const spaces = ' '.repeat(indent * 2);
    
    switch (component.type) {
      case 'Header':
        return `${spaces}<Header title="${component.props.title}" />`;
        
      case 'TextInput':
        return `${spaces}<TextInput
${spaces}  placeholder="${component.props.placeholder}"
${spaces}  type="${component.props.type || 'text'}"
${spaces}  value={${component.id.replace('-', '_')}}
${spaces}  onChange={(e) => set${this.capitalize(component.id.replace('-', '_'))}(e.target.value)}
${spaces}/>`;
        
      case 'Button':
        return `${spaces}<Button
${spaces}  text="${component.props.text}"
${spaces}  onClick={handle${this.capitalize(component.props.action)}}
${spaces}  variant="${component.props.style || 'primary'}"
${spaces}/>`;
        
      case 'List':
        return `${spaces}<List
${spaces}  data={data?.${component.props.data.replace('${', '').replace('}', '')}}
${spaces}  renderItem={(item) => <${component.props.itemComponent} item={item} />}
${spaces}  emptyMessage="${component.props.emptyMessage}"
${spaces}/>`;
        
      case 'Container':
        const children = component.components?.map(child => 
          this.renderComponent(child, indent + 1)
        ).join('\n');
        return `${spaces}<div className="${component.layout}-layout">
${children}
${spaces}</div>`;
        
      default:
        return `${spaces}<${component.type} {...${JSON.stringify(component.props)}} />`;
    }
  }

  // Generate React Component
  generateReactComponent(name, component) {
    return `import React from 'react';
import './styles/${name}.css';

function ${name}({ ${this.getComponentProps(component).join(', ')} }) {
  return (
    <div className="${name.toLowerCase()}-component">
      ${this.generateComponentBody(component)}
    </div>
  );
}

export default ${name};`;
  }

  // Get component props
  getComponentProps(component) {
    const props = new Set(['className']);
    
    if (component.props) {
      Object.keys(component.props).forEach(prop => {
        if (prop.includes('${')) {
          props.add(prop.replace('${', '').replace('}', ''));
        }
      });
    }
    
    return Array.from(props);
  }

  // Generate component body
  generateComponentBody(component) {
    // Simplified - would be more complex for real components
    return `<!-- ${component.type} implementation -->`;
  }

  // Generate API Service
  generateAPIService(apiSpec) {
    return `import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '${apiSpec.base_url || '/api/v1'}';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

// API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  logout: () => api.post('/auth/logout'),
};

${this.generateAPIEndpoints(apiSpec.endpoints)}

export { api };`;
  }

  // Generate API endpoints
  generateAPIEndpoints(endpoints) {
    if (!endpoints) return '';
    
    const grouped = {};
    endpoints.forEach(endpoint => {
      const [, resource] = endpoint.path.split('/').filter(Boolean);
      if (!grouped[resource]) grouped[resource] = [];
      grouped[resource].push(endpoint);
    });
    
    return Object.entries(grouped).map(([resource, endpoints]) => {
      const methods = endpoints.map(endpoint => {
        const methodName = this.getMethodName(endpoint);
        const params = endpoint.path.includes(':') ? 'id, ' : '';
        const body = endpoint.method === 'POST' || endpoint.method === 'PUT' ? 'data' : '';
        
        return `  ${methodName}: (${params}${body}) => api.${endpoint.method.toLowerCase()}(\`${endpoint.path.replace(':id', '${id}')}\`${body ? `, ${body}` : ''}),`;
      }).join('\n');
      
      return `export const ${resource}API = {\n${methods}\n};`;
    }).join('\n\n');
  }

  // Get method name from endpoint
  getMethodName(endpoint) {
    const method = endpoint.method.toLowerCase();
    const resource = endpoint.path.split('/').filter(Boolean).pop();
    
    const methodMap = {
      'get': resource.includes(':') ? 'getById' : 'getAll',
      'post': 'create',
      'put': 'update',
      'delete': 'delete'
    };
    
    return methodMap[method] || method;
  }

  // Generate data models
  generateDataModels(dataModels) {
    const models = [];
    
    dataModels.forEach((model, name) => {
      models.push(`
export class ${name} {
  constructor(data = {}) {
${Object.entries(model.fields).map(([field, type]) => 
  `    this.${field} = data.${field} || ${this.getDefaultValue(type)};`
).join('\n')}
  }

  validate() {
    const errors = {};
${Object.entries(model.fields).map(([field, type]) => {
  if (type.includes('required')) {
    return `    if (!this.${field}) errors.${field} = '${field} is required';`;
  }
  return '';
}).filter(Boolean).join('\n')}
    return Object.keys(errors).length ? errors : null;
  }
}`);
    });
    
    return models.join('\n');
  }

  // Get default value for type
  getDefaultValue(type) {
    if (type.includes('string')) return "''";
    if (type.includes('number')) return '0';
    if (type.includes('boolean')) return 'false';
    if (type.includes('array')) return '[]';
    return 'null';
  }

  // Generate React Router
  generateReactRouter(spec) {
    const routes = Array.from(spec.screens.keys());
    
    return `import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Screen imports
${routes.map(screen => 
  `import ${screen} from '../screens/${screen}';`
).join('\n')}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/${routes[0].toLowerCase()}" />} />
${routes.map(screen => 
  `      <Route path="/${screen.toLowerCase()}" element={<${screen} />} />`
).join('\n')}
    </Routes>
  );
}

export default Router;`;
  }

  // Generate global styles
  generateGlobalStyles() {
    return `/* Global Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app {
  min-height: 100vh;
}

.screen {
  max-width: 480px;
  margin: 0 auto;
  background: white;
  min-height: 100vh;
}

/* Layout utilities */
.vertical-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.horizontal-layout {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

/* Component styles */
button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

button.primary {
  background: #007AFF;
  color: white;
}

button.primary:hover {
  background: #0056b3;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #007AFF;
}`;
  }

  // Extract components from screens
  extractComponents(screens) {
    const components = new Map();
    
    screens.forEach(screen => {
      screen.components?.forEach(comp => {
        if (comp.type && !['Container', 'Text'].includes(comp.type)) {
          components.set(comp.type, comp);
        }
      });
    });
    
    return components;
  }

  // Utility: Capitalize string
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Generate deployment configuration
  generateDeploymentConfig(spec, platform) {
    const configs = {
      railway: {
        'railway.json': JSON.stringify({
          build: {
            builder: 'NIXPACKS',
            buildCommand: 'npm install && npm run build'
          },
          deploy: {
            startCommand: 'npm start',
            restartPolicyType: 'ON_FAILURE',
            restartPolicyMaxRetries: 10
          }
        }, null, 2),
        '.env.example': `REACT_APP_API_URL=https://api.${spec.project.name?.toLowerCase()}.app
REACT_APP_ENV=production`
      }
    };

    return configs[platform] || {};
  }
}

module.exports = APMLCodeGenerator;