/**
 * APML Parser and Serializer
 * Handles APML (YAML-like) format for all ADE communications
 */

class APML {
  /**
   * Parse APML string to JavaScript object
   */
  static parse(apmlString) {
    const lines = apmlString.trim().split('\n');
    const result = {};
    let currentObject = result;
    let currentIndent = 0;
    const stack = [{ obj: result, indent: -1 }];
    let inHeader = false;
    let headerData = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle document separator
      if (line.trim() === '---') {
        if (!inHeader && i === 0) {
          inHeader = true;
          continue;
        } else if (inHeader) {
          inHeader = false;
          Object.assign(result, headerData);
          headerData = {};
          continue;
        }
      }
      
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) continue;
      
      // Calculate indentation
      const indent = line.length - line.trimStart().length;
      const trimmed = line.trim();
      
      // Handle key-value pairs
      if (trimmed.includes(':')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        
        // Pop stack to correct level
        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
          stack.pop();
        }
        currentObject = stack[stack.length - 1].obj;
        
        if (value) {
          // Simple key-value
          if (value.startsWith('[') && value.endsWith(']')) {
            // Inline array
            currentObject[key] = value.slice(1, -1).split(',').map(v => v.trim());
          } else {
            // String or number
            currentObject[key] = isNaN(value) ? value : Number(value);
          }
        } else {
          // Object or array will follow
          currentObject[key] = {};
          stack.push({ obj: currentObject[key], indent });
        }
        
        if (inHeader) {
          headerData[key] = currentObject[key];
        }
      } else if (trimmed.startsWith('- ')) {
        // Array item
        const value = trimmed.substring(2);
        const parent = stack[stack.length - 1].obj;
        const lastKey = Object.keys(parent).pop();
        
        if (!Array.isArray(parent[lastKey])) {
          parent[lastKey] = [];
        }
        parent[lastKey].push(value);
      }
    }
    
    return result;
  }
  
  /**
   * Serialize JavaScript object to APML string
   */
  static stringify(obj, options = {}) {
    const { includeHeader = true } = options;
    let result = '';
    
    // Extract header fields
    const headerFields = ['apml', 'type', 'id', 'from', 'to', 'timestamp'];
    const header = {};
    const body = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (headerFields.includes(key)) {
        header[key] = value;
      } else {
        body[key] = value;
      }
    }
    
    // Write header
    if (includeHeader && Object.keys(header).length > 0) {
      result += '---\n';
      result += this._stringifyObject(header, 0);
      result += '---\n';
    }
    
    // Write body
    result += this._stringifyObject(body, 0);
    
    return result.trim();
  }
  
  static _stringifyObject(obj, indent) {
    let result = '';
    
    for (const [key, value] of Object.entries(obj)) {
      const padding = ' '.repeat(indent);
      
      if (value === null || value === undefined) {
        result += `${padding}${key}:\n`;
      } else if (Array.isArray(value)) {
        result += `${padding}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            result += `${padding}  -\n`;
            result += this._stringifyObject(item, indent + 4);
          } else {
            result += `${padding}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        result += `${padding}${key}:\n`;
        result += this._stringifyObject(value, indent + 2);
      } else {
        result += `${padding}${key}: ${value}\n`;
      }
    }
    
    return result;
  }
  
  /**
   * Convert APML to JSON for MCP compatibility
   */
  static toJSON(apmlString) {
    return JSON.stringify(this.parse(apmlString));
  }
  
  /**
   * Convert JSON to APML
   */
  static fromJSON(jsonString) {
    return this.stringify(JSON.parse(jsonString));
  }
}

// Make APML available globally
window.APML = APML;