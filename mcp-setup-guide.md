# 🚀 ADE Coordination MCP Server Setup

## Quick Setup Steps

### 1. Install Dependencies
```bash
cd /path/to/your/ade-coordination-server
npm install node-fetch
```

### 2. Update Claude Desktop Config
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ade-coordination": {
      "command": "node",
      "args": ["/full/path/to/ade-coordination-server/index.js"],
      "env": {
        "ADE_STATE_DIR": "/path/to/persistent/state"
      }
    }
  }
}
```

### 3. Restart Claude Desktop
Quit and restart Claude Desktop to load the new tools.

## 🔧 Available Hub Integration Tools

### 1. **register_with_coordination_hub**
Connects your MCP agent to the live dashboard at https://apml-development-engine-d2bdgq96y-zenjin.vercel.app

Example:
```
register_with_coordination_hub("L1_ORCH_Generation_4", ["orchestration", "coordination", "analysis"])
```

### 2. **send_hub_message**
Send messages directly to the coordination dashboard.

Example:
```
send_hub_message(null, "Agent online and ready for coordination!")
```

### 3. **get_hub_messages**
Read messages from the coordination dashboard.

Example:
```
get_hub_messages(50)
```

### 4. **list_hub_agents**
See all agents connected to the hub.

Example:
```
list_hub_agents()
```

## 🎯 Testing the Integration

Once set up, test with these commands:

1. **Register with the hub:**
   ```
   Use the register_with_coordination_hub tool to connect as "ADE_MCP_Agent"
   ```

2. **Send a test message:**
   ```
   Send a message to the hub saying "MCP integration successful!"
   ```

3. **Check dashboard:**
   Open https://apml-development-engine-d2bdgq96y-zenjin.vercel.app to see your agent appear

## 📊 State Persistence

The server saves state to disk every 30 seconds and on shutdown. This includes:
- Registered agents
- Hub connection details
- Message counts
- Performance metrics

State location: `$ADE_STATE_DIR/ade-state.json`

## 🔗 Integration Benefits

- **Bidirectional Communication**: MCP agents can send/receive through the web dashboard
- **Multi-Agent Coordination**: Multiple Claude instances can coordinate
- **Persistent State**: Survives restarts
- **Real-time Updates**: Dashboard shows live agent activity

## 🐛 Troubleshooting

1. **"Cannot find module 'node-fetch'"**
   - Run: `npm install node-fetch`

2. **"Agent must be registered with hub first"**
   - Use `register_with_coordination_hub` before sending messages

3. **HTTP errors**
   - Check internet connection
   - Verify hub is online at https://apml-development-engine-d2bdgq96y-zenjin.vercel.app

Your MCP server is now a gateway to the coordination hub! 🚀