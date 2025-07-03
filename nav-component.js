// Shared Navigation Component for ADE
function createADENav(currentPage = '') {
    const navHTML = `
        <nav class="ade-nav">
            <div class="ade-nav-content">
                <a href="/" class="ade-nav-logo">ADE</a>
                <div class="ade-nav-links">
                    <a href="/chat" class="ade-nav-link ${currentPage === 'chat' ? 'active' : ''}">
                        <span class="ade-nav-icon">💬</span>
                        <span>Chat</span>
                    </a>
                    <a href="/builder" class="ade-nav-link ${currentPage === 'builder' ? 'active' : ''}">
                        <span class="ade-nav-icon">🚀</span>
                        <span>Builder</span>
                    </a>
                    <a href="/dashboard" class="ade-nav-link ${currentPage === 'dashboard' ? 'active' : ''}">
                        <span class="ade-nav-icon">📁</span>
                        <span>VFS</span>
                    </a>
                    <a href="/visualizer" class="ade-nav-link ${currentPage === 'visualizer' ? 'active' : ''}">
                        <span class="ade-nav-icon">🔗</span>
                        <span>Visualizer</span>
                    </a>
                    <a href="/cost-calculator" class="ade-nav-link ${currentPage === 'cost' ? 'active' : ''}">
                        <span class="ade-nav-icon">💰</span>
                        <span>Costs</span>
                    </a>
                </div>
                <div class="ade-nav-status">
                    <div class="ade-nav-status-dot"></div>
                    <span>Connected</span>
                </div>
            </div>
        </nav>
    `;
    
    // Inject navigation
    document.body.insertAdjacentHTML('afterbegin', navHTML);
    
    // Add nav styles if not already added
    if (!document.querySelector('link[href*="shared-nav-styles.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/shared-nav-styles.css';
        document.head.appendChild(link);
    }
    
    // Add with-nav class to body
    document.body.classList.add('with-nav');
}