#!/bin/bash

echo "🔍 Monitoring L1_ORCH ADE Build Progress..."
echo "Press Ctrl+C to stop"
echo

LAST_COUNT=26
LAST_LOG=""

while true; do
    clear
    echo "==================================="
    echo "🏗️  ADE BUILD MONITOR"
    echo "==================================="
    echo "Time: $(date +"%H:%M:%S")"
    echo
    
    # Get VFS file count
    COUNT=$(curl -s http://localhost:3000/api/vfs | grep "count:" | awk '{print $2}')
    echo "📁 Total VFS Files: $COUNT"
    
    # Check for changes
    if [ "$COUNT" != "$LAST_COUNT" ]; then
        DIFF=$((COUNT - LAST_COUNT))
        echo "🆕 NEW FILES ADDED: +$DIFF"
        LAST_COUNT=$COUNT
    fi
    
    echo
    echo "📝 Recent Activity:"
    echo "-----------------------------------"
    tail -10 /Users/tomcassidy/claude-code-experiments/APML-Projects/ADE/multi-agent-system/server.log | grep -E "(VFS:|Client|agent|Agent)" | tail -5
    
    # Check for errors or warnings
    echo
    echo "⚠️  Checking for Issues:"
    echo "-----------------------------------"
    tail -20 /Users/tomcassidy/claude-code-experiments/APML-Projects/ADE/multi-agent-system/server.log | grep -iE "(error|warning|failed|issue)" | tail -3
    
    # Check active connections
    echo
    CLIENTS=$(tail -50 /Users/tomcassidy/claude-code-experiments/APML-Projects/ADE/multi-agent-system/server.log | grep "Total clients:" | tail -1 | awk '{print $NF}')
    echo "🔌 Active Connections: ${CLIENTS:-unknown}"
    
    # Latest files
    echo
    echo "📄 Latest Files:"
    echo "-----------------------------------"
    curl -s http://localhost:3000/api/vfs | grep "path:" | tail -5
    
    sleep 5
done