#!/bin/bash

echo "🔧 L1_ORCH Bridge Connection Test"
echo "================================="

# Check if Node.js is available
echo -e "\n1. Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "❌ Node.js not found!"
    exit 1
fi

# Check if bridge is already running
echo -e "\n2. Checking for existing bridge process..."
if pgrep -f "l1-orch-bridge.js" > /dev/null; then
    echo "✅ Bridge is already running"
    BRIDGE_PID=$(pgrep -f "l1-orch-bridge.js")
    echo "   PID: $BRIDGE_PID"
else
    echo "⚠️  Bridge is not running"
    echo "   Starting bridge..."
    node l1-orch-bridge.js > bridge-test.log 2>&1 &
    BRIDGE_PID=$!
    echo "   Started with PID: $BRIDGE_PID"
    sleep 2
fi

# Test HTTP status endpoint
echo -e "\n3. Testing HTTP status endpoint..."
if curl -s http://localhost:8766/status > /dev/null 2>&1; then
    echo "✅ HTTP status endpoint is accessible"
    STATUS=$(curl -s http://localhost:8766/status)
    echo "   Response: $STATUS"
else
    echo "❌ HTTP status endpoint failed"
fi

# Test local WebSocket using wscat if available
echo -e "\n4. Testing local WebSocket server..."
if command -v wscat &> /dev/null; then
    echo "Testing with wscat..."
    timeout 2 wscat -c ws://localhost:8765 2>&1 | head -n 5
else
    echo "⚠️  wscat not found, checking port availability..."
    if nc -z localhost 8765 2>/dev/null; then
        echo "✅ Port 8765 is open (WebSocket server likely running)"
    else
        echo "❌ Port 8765 is not accessible"
    fi
fi

# Check bridge logs
echo -e "\n5. Recent bridge logs:"
if [ -f bridge-test.log ]; then
    echo "From bridge-test.log:"
    tail -n 10 bridge-test.log
elif [ -f bridge.log ]; then
    echo "From bridge.log:"
    tail -n 10 bridge.log
else
    echo "⚠️  No log files found"
fi

# Check network connectivity to remote
echo -e "\n6. Testing connectivity to remote ADE..."
if ping -c 1 ade-app.up.railway.app > /dev/null 2>&1; then
    echo "✅ Can reach ade-app.up.railway.app"
else
    echo "⚠️  Cannot ping remote (this might be normal if ICMP is blocked)"
fi

# Summary
echo -e "\n================================="
echo "Test Summary:"
echo "================================="
echo "Node.js: ✅ Available"
if pgrep -f "l1-orch-bridge.js" > /dev/null; then
    echo "Bridge Process: ✅ Running (PID: $(pgrep -f 'l1-orch-bridge.js'))"
else
    echo "Bridge Process: ❌ Not Running"
fi

# Cleanup if we started the bridge
if [ ! -z "$BRIDGE_PID" ] && [ "$1" == "--cleanup" ]; then
    echo -e "\nCleaning up..."
    kill $BRIDGE_PID 2>/dev/null
    echo "Stopped bridge process"
fi