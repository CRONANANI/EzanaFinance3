// Page Loader Utility for Ezana Finance
class PageLoader {
    constructor() {
        this.currentPage = null;
        this.cache = new Map();
    }

    async loadPage(pageName) {
        try {
            // Check cache first
            if (this.cache.has(pageName)) {
                return this.cache.get(pageName);
            }

            // Load page from file
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${pageName}`);
            }

            const content = await response.text();
            
            // Cache the content
            this.cache.set(pageName, content);
            
            return content;
        } catch (error) {
            console.error(`Error loading page ${pageName}:`, error);
            return this.getErrorPage(pageName);
        }
    }

    getErrorPage(pageName) {
        return `
            <div class="container mx-auto px-4 py-8">
                <div class="text-center py-16">
                    <div class="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="bi bi-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h1>
                    <p class="text-gray-600 dark:text-gray-400 mb-8">Sorry, we couldn't load the ${pageName} page.</p>
                    <button onclick="showLandingPage()" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                        Return Home
                    </button>
                </div>
            </div>
        `;
    }

    async renderPage(pageName, containerId = 'dynamic-content') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="flex items-center justify-center py-16">
                <div class="text-center">
                    <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p class="text-gray-600 dark:text-gray-400">Loading ${pageName}...</p>
                </div>
            </div>
        `;

        // Load and render page content
        const content = await this.loadPage(pageName);
        container.innerHTML = content;
        
        // Set current page
        this.currentPage = pageName;
        
        // Initialize page-specific functionality
        this.initializePage(pageName);
    }

    initializePage(pageName) {
        switch (pageName) {
            case 'home-dashboard':
                this.initializeHomeDashboard();
                break;
            case 'inside-the-capitol':
                this.initializeInsideTheCapitol();
                break;
            case 'market-analysis':
                this.initializeMarketAnalysis();
                break;
            case 'company-research':
                this.initializeCompanyResearch();
                break;
            case 'economic-indicators':
                this.initializeEconomicIndicators();
                break;
            case 'watchlist':
                this.initializeWatchlist();
                break;
            case 'community':
                this.initializeCommunity();
                break;
        }
    }

    initializeHomeDashboard() {
        // Initialize portfolio charts and data
        this.loadPortfolioData();
        this.setupPortfolioEventListeners();
    }

    initializeInsideTheCapitol() {
        // Initialize congressional trading data
        initializeCongressTradingData();
    }

    initializeMarketAnalysis() {
        // Initialize market analysis tools
        this.loadMarketData();
    }

    initializeCompanyResearch() {
        // Initialize company research tools
        this.setupCompanySearch();
    }

    initializeEconomicIndicators() {
        // Initialize economic indicators
        this.loadEconomicData();
    }

    initializeWatchlist() {
        // Initialize watchlist functionality
        this.loadWatchlistData();
    }

    initializeCommunity() {
        // Initialize community features
        this.loadCommunityData();
    }

    async loadPortfolioData() {
        try {
            // Update last updated timestamp
            const timestamp = new Date().toLocaleString();
            const lastUpdatedEl = document.getElementById('portfolio-last-updated');
            if (lastUpdatedEl) {
                lastUpdatedEl.textContent = timestamp;
            }
        } catch (error) {
            console.error('Error loading portfolio data:', error);
        }
    }

    setupPortfolioEventListeners() {
        // Add event listeners for portfolio interactions
        console.log('Portfolio event listeners setup complete');
    }

    async loadMarketData() {
        try {
            // Load market data
            console.log('Loading market analysis data...');
        } catch (error) {
            console.error('Error loading market data:', error);
        }
    }

    setupCompanySearch() {
        const searchInput = document.getElementById('company-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchCompany();
                }
            });
        }
    }

    async loadEconomicData() {
        try {
            console.log('Loading economic indicators...');
        } catch (error) {
            console.error('Error loading economic data:', error);
        }
    }

    async loadWatchlistData() {
        try {
            // Update following count
            const followingCount = document.getElementById('following-count');
            if (followingCount && followedCongressPeople) {
                followingCount.textContent = followedCongressPeople.size || 0;
            }
        } catch (error) {
            console.error('Error loading watchlist data:', error);
        }
    }

    async loadCommunityData() {
        try {
            console.log('Loading community data...');
        } catch (error) {
            console.error('Error loading community data:', error);
        }
    }

    clearCache() {
        this.cache.clear();
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

// Global page loader instance
const pageLoader = new PageLoader();

// Global functions for page-specific functionality
async function refreshPortfolioData() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="bi bi-arrow-clockwise animate-spin mr-2"></i>Refreshing...';
    button.disabled = true;
    
    try {
        await pageLoader.loadPortfolioData();
        showNotification('Portfolio data refreshed successfully!', 'success');
    } catch (error) {
        showNotification('Failed to refresh portfolio data', 'error');
    } finally {
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 1000);
    }
}

function togglePortfolioExpansion() {
    const card = document.querySelector('.dashboard-card.expandable-portfolio');
    const content = document.getElementById('portfolio-chart-content');
    
    if (!card || !content) return;
    
    const isExpanded = card.classList.contains('expanded');
    
    if (isExpanded) {
        card.classList.remove('expanded');
        content.classList.remove('expanded');
        content.classList.add('hidden');
    } else {
        card.classList.add('expanded');
        content.classList.remove('hidden');
        setTimeout(() => {
            content.classList.add('expanded');
        }, 10);
    }
}

function toggleAssetAllocationExpansion() {
    const card = document.querySelector('.dashboard-card.expandable-asset-allocation');
    const content = document.getElementById('asset-allocation-chart-content');
    
    if (!card || !content) return;
    
    const isExpanded = card.classList.contains('expanded');
    
    if (isExpanded) {
        card.classList.remove('expanded');
        content.classList.remove('expanded');
        content.classList.add('hidden');
    } else {
        card.classList.add('expanded');
        content.classList.remove('hidden');
        setTimeout(() => {
            content.classList.add('expanded');
        }, 10);
    }
}

function searchCompany() {
    const searchInput = document.getElementById('company-search');
    const resultsDiv = document.getElementById('company-analysis-results');
    
    if (!searchInput || !resultsDiv) return;
    
    const query = searchInput.value.trim();
    if (!query) {
        showNotification('Please enter a company name or ticker symbol', 'error');
        return;
    }
    
    // Show results section
    resultsDiv.classList.remove('hidden');
    
    // Mock company data based on search
    const mockData = {
        'AAPL': { name: 'Apple Inc.', sector: 'Technology', price: 175.43, change: 2.34 },
        'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', price: 384.52, change: 1.89 },
        'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology', price: 142.67, change: -0.45 },
        'TSLA': { name: 'Tesla Inc.', sector: 'Automotive', price: 248.91, change: 3.21 }
    };
    
    const company = mockData[query.toUpperCase()] || mockData['AAPL'];
    
    // Update company data in the results
    document.getElementById('company-ticker').textContent = query.toUpperCase();
    document.getElementById('company-name').textContent = company.name;
    document.getElementById('company-sector').textContent = company.sector;
    document.getElementById('company-price').textContent = `$${company.price}`;
    document.getElementById('company-change').textContent = `${company.change >= 0 ? '+' : ''}$${company.change} (${((company.change / company.price) * 100).toFixed(2)}%)`;
    
    showNotification(`Analysis loaded for ${company.name}`, 'success');
}

function createNewWatchlist() {
    showNotification('New watchlist creation coming soon!', 'info');
}

function searchUsers() {
    const searchInput = document.getElementById('user-search');
    const resultsContainer = document.getElementById('search-results');
    
    if (!searchInput || !resultsContainer) return;
    
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        resultsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">Please enter a search term</p>';
        return;
    }

    // Mock search results
    const mockResults = [
        { name: 'John Smith', username: 'johnsmith', avatar: 'bg-gradient-to-br from-blue-400 to-purple-500', status: 'Online', performance: '+15.2%' },
        { name: 'Emma Wilson', username: 'emmaw', avatar: 'bg-gradient-to-br from-emerald-400 to-blue-500', status: '2h ago', performance: '+8.7%' },
        { name: 'Michael Brown', username: 'mikeb', avatar: 'bg-gradient-to-br from-red-400 to-pink-500', status: '1d ago', performance: '+22.1%' }
    ];

    resultsContainer.innerHTML = mockResults.map(user => `
        <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 ${user.avatar} rounded-full flex items-center justify-center">
                    <span class="text-white text-xs font-bold">${user.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">${user.name}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">@${user.username} • ${user.performance}</p>
                </div>
            </div>
            <button onclick="sendFriendRequest('${user.username}')" class="bg-emerald-600 text-white px-3 py-1 rounded-md text-xs hover:bg-emerald-700 transition-colors">
                Add Friend
            </button>
        </div>
    `).join('');
}

function sendFriendRequest(username) {
    showNotification(`Friend request sent to @${username}!`, 'success');
}

function viewAllFriends() {
    showNotification('Opening friends management page...', 'info');
}

function viewAllActivity() {
    showNotification('Opening full activity feed...', 'info');
}

function createThread() {
    showNotification('Opening thread creation form...', 'info');
}

function viewThreads() {
    showNotification('Opening community threads...', 'info');
}

function manageCommunities() {
    showNotification('Opening community management...', 'info');
}

function viewAllAwards() {
    showNotification('Opening awards gallery...', 'info');
}

function showTrophyRoom() {
    const modal = document.getElementById('trophy-room-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function hideTrophyRoom() {
    const modal = document.getElementById('trophy-room-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Close trophy room modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('trophy-room-modal');
    if (modal && event.target === modal) {
        hideTrophyRoom();
    }
});
