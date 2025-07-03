# Connect Claude Desktop to ADE Production

## Step 1: Find Your Claude Desktop Config File

### macOS:
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Windows:
```
%APPDATA%\Claude\claude_desktop_config.json
```

### Linux:
```
~/.config/Claude/claude_desktop_config.json
```

## Step 2: Add ADE to Your Config

Edit the config file and add:

```json
{
  "mcpServers": {
    "ade": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-bridge.js"],
      "env": {
        "ADE_URL": "https://ade-app.up.railway.app",
        "ADE_API_KEY": "your-secret-key-here"
      }
    }
  }
}
```

## Step 3: Set Up Security (Railway Dashboard)

1. Go to your Railway project
2. Add environment variable:
   ```
   MCP_API_KEY=your-secret-key-here
   ```
3. Redeploy

## Step 4: Get the Bridge Script

Save this as `mcp-bridge.js` somewhere on your machine:

```bash
curl -o ~/Documents/mcp-bridge.js https://raw.githubusercontent.com/your-repo/mcp-bridge.js
# OR just use the one you already have
```

## Step 5: Test the Connection

1. Restart Claude Desktop
2. Look for "ade" in the MCP tools list
3. Try these commands:
   - "Search APML patterns for authentication"
   - "Show me the available tools"
   - "Create a todo app specification"

## What's Happening:

```
Claude Desktop → mcp-bridge.js (local) → HTTPS → Railway ADE → Tools
     ↓                    ↓                           ↓
[Your machine]    [Translates stdio]         [Your production app]
                    [to HTTP calls]
```

## Troubleshooting:

### "Can't find ade tools"
- Check the path to mcp-bridge.js is absolute
- Ensure file has execute permissions: `chmod +x mcp-bridge.js`

### "Unauthorized error"
- Check API key matches in both config and Railway
- Ensure Railway has redeployed with new env var

### "Connection refused"
- Check ADE_URL is https:// not http://
- Verify Railway app is running

## Quick Test Script:

```bash
# Test if your bridge works
export ADE_URL=https://ade-app.up.railway.app
export ADE_API_KEY=your-secret-key-here
echo '{"method":"tools/list","id":1}' | node ~/Documents/mcp-bridge.js
```

You should see a list of tools!

## Production Ready!

Now you can:
- Use Claude Desktop with your production ADE
- All tools access your Railway deployment
- APML patterns stored in production
- VFS operations go to production storage
- Same tools available to all team members

The webapp IS the MCP server! 🚀