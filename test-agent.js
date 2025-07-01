/**
 * Test Agent - Demonstrates how to connect and use the multi-agent system
 */

import { MultiAgentMCPAdapter } from './mcp-adapter.js';

// Create different types of test agents
async function createTestAgents() {
    // Code Analyzer Agent
    const analyzer = new MultiAgentMCPAdapter({
        agentName: 'Code Analyzer',
        capabilities: ['code-review', 'security-scan', 'complexity-analysis']
    });
    
    analyzer.onMessage('analyze-request', async (message) => {
        console.log(`[Analyzer] Received request: ${message.content}`);
        
        // Simulate analysis
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const result = {
            complexity: Math.floor(Math.random() * 10) + 1,
            issues: ['Consider adding error handling', 'Function too long'],
            securityScore: 8.5
        };
        
        // Send response
        await analyzer.sendMessage(
            message.from,
            JSON.stringify(result),
            'analysis-result'
        );
        
        // Share report file
        const report = `# Code Analysis Report\n\nComplexity: ${result.complexity}/10\n\n## Issues Found\n${result.issues.join('\n- ')}\n\n## Security Score: ${result.securityScore}/10`;
        
        await analyzer.shareFile('analysis-report.md', report, {
            requestId: message.id
        });
    });
    
    // Test Runner Agent
    const testRunner = new MultiAgentMCPAdapter({
        agentName: 'Test Runner',
        capabilities: ['unit-test', 'integration-test', 'performance-test']
    });
    
    testRunner.onTask('unit-test', async (task) => {
        console.log(`[Test Runner] Running tests for: ${task.description}`);
        testRunner.updateTaskStatus(task.id, 'in-progress');
        
        // Simulate test execution
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const result = {
            passed: 42,
            failed: 3,
            skipped: 5,
            duration: '3.2s'
        };
        
        testRunner.updateTaskStatus(task.id, 'completed', result);
        
        // Broadcast test results
        await testRunner.sendMessage(
            null,
            `Test run complete: ${result.passed} passed, ${result.failed} failed`,
            'test-results'
        );
    });
    
    // Documentation Generator Agent
    const docGen = new MultiAgentMCPAdapter({
        agentName: 'Doc Generator',
        capabilities: ['generate-docs', 'update-readme', 'api-docs']
    });
    
    docGen.onMessage('file-created', async (message) => {
        if (message.metadata && message.metadata.filename.endsWith('.js')) {
            console.log(`[DocGen] Generating docs for: ${message.metadata.filename}`);
            
            // Simulate doc generation
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const docs = `## API Documentation\n\n### ${message.metadata.filename}\n\nAuto-generated documentation...`;
            
            await docGen.shareFile(
                `${message.metadata.filename}.md`,
                docs,
                { sourceFile: message.metadata.fileId }
            );
        }
    });
    
    // Register all agents
    await Promise.all([
        analyzer.register(),
        testRunner.register(),
        docGen.register()
    ]);
    
    console.log('All test agents registered and ready');
    
    // Simulate some interactions
    setTimeout(async () => {
        // Analyzer requests test run
        await analyzer.createTask(
            'unit-test',
            'Test the new authentication module',
            [],
            'high'
        );
        
        // Test runner sends analysis request
        await testRunner.sendMessage(
            analyzer.agentId,
            'Please analyze the test results',
            'analyze-request'
        );
    }, 2000);
    
    return { analyzer, testRunner, docGen };
}

// Run test agents
createTestAgents().catch(console.error);

// Keep process alive
process.on('SIGINT', () => {
    console.log('\nShutting down test agents...');
    process.exit(0);
});