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

            // Try to load page from file
            let content;
            try {
                const response = await fetch(`pages/${pageName}.html`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                content = await response.text();
            } catch (fetchError) {
                console.warn(`Could not fetch page file for ${pageName}:`, fetchError);
                // Fallback to inline content
                content = this.getInlinePageContent(pageName);
            }
            
            // Cache the content
            this.cache.set(pageName, content);
            
            return content;
        } catch (error) {
            console.error(`Error loading page ${pageName}:`, error);
            return this.getErrorPage(pageName);
        }
    }

    getInlinePageContent(pageName) {
        // Fallback content for when page files can't be loaded
        switch (pageName) {
            case 'home-dashboard':
                return this.getHomeDashboardContent();
            case 'inside-the-capitol':
                return this.getInsideTheCapitolContent();
            case 'market-analysis':
                return this.getMarketAnalysisContent();
            case 'company-research':
                return this.getCompanyResearchContent();
            case 'economic-indicators':
                return this.getEconomicIndicatorsContent();
            case 'watchlist':
                return this.getWatchlistContent();
            case 'community':
                return this.getCommunityContent();
            default:
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

    // Fallback content methods
    getHomeDashboardContent() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">Portfolio Dashboard</h1>
                <div class="portfolio-grid">
                    <div class="dashboard-card">
                        <div class="dashboard-card-header">
                            <h3 class="dashboard-card-title">Total Portfolio Value</h3>
                            <div class="dashboard-card-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                <i class="bi bi-wallet2 text-xl"></i>
                            </div>
                        </div>
                        <div class="dashboard-card-value">$127,843.52</div>
                        <div class="dashboard-card-change positive">
                            <i class="bi bi-arrow-up"></i>
                            +$2,847.31 (+2.28%)
                        </div>
                        <div class="dashboard-card-description">Updated 2 minutes ago</div>
                    </div>
                    <!-- Add more cards here -->
                </div>
            </div>
        `;
    }

    getInsideTheCapitolContent() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">Inside the Capitol</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">Real-time insights into congressional trading and government activities</p>
                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div class="bg-emerald-50 dark:bg-emerald-950 rounded-xl shadow-md p-6 border-2 border-emerald-500">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Congressional Trading</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Total Trades:</span>
                                <span class="font-semibold text-gray-900 dark:text-gray-100">1,247</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Total Volume:</span>
                                <span class="font-semibold text-gray-900 dark:text-gray-100">$45.2M</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getMarketAnalysisContent() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">Market Analysis</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">Advanced market analysis tools and insights</p>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 dark:text-gray-400">S&P 500</p>
                                <p class="text-2xl font-bold text-gray-900 dark:text-white">4,567.89</p>
                                <p class="text-sm text-emerald-600 dark:text-emerald-400">+1.24%</p>
                            </div>
                            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <i class="bi bi-graph-up text-blue-600 dark:text-blue-400 text-xl"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCompanyResearchContent() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">Company Research</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">Comprehensive company analysis and research tools</p>
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Company Search</h3>
                    <div class="flex gap-4">
                        <input type="text" id="company-search" placeholder="Search by company name or ticker symbol" 
                               class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white">
                        <button onclick="searchCompany()" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                            <i class="bi bi-search mr-2"></i>Search
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getEconomicIndicatorsContent() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-4">Economic Indicators</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">Key economic data and market indicators</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Inflation Rate</h3>
                        <div class="text-2xl font-bold text-gray-900 dark:text-white">3.2%</div>
                        <div class="text-sm text-red-600 dark:text-red-400">+0.1% from last month</div>
                    </div>
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unemployment</h3>
                        <div class="text-2xl font-bold text-gray-900 dark:text-white">3.7%</div>
                        <div class="text-sm text-emerald-600 dark:text-emerald-400">-0.2% from last month</div>
                    </div>
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">GDP Growth</h3>
                        <div class="text-2xl font-bold text-gray-900 dark:text-white">2.8%</div>
                        <div class="text-sm text-emerald-600 dark:text-emerald-400">+0.3% quarterly</div>
                    </div>
                </div>
            </div>
        `;
    }

    getWatchlistContent() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">Watchlists</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">Track your favorite congress people and investments</p>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">People I'm Following</h3>
                        <div id="following-section">
                            ${this.renderFollowingSection()}
                        </div>
                    </div>
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Stock Watchlists</h3>
                        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                            <i class="bi bi-graph-up text-4xl mb-4"></i>
                            <p>Stock watchlist functionality coming soon!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCommunityContent() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">Community Hub</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">Connect, share, and grow with fellow investors</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Find Users</h3>
                        <input type="text" placeholder="Search users..." class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                    </div>
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">My Friends</h3>
                        <div class="text-center py-4">
                            <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">47</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Total Friends</div>
                        </div>
                    </div>
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Leaderboard</h3>
                        <div class="text-center py-4">
                            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">#127</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Your Rank</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFollowingSection() {
        if (!window.followedCongressPeople || followedCongressPeople.size === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <i class="bi bi-star text-4xl mb-4"></i>
                    <p>You're not following anyone yet.</p>
                    <p class="text-sm">Click the star icon next to congress people's names to follow them.</p>
                </div>
            `;
        } else {
            return `
                <div class="space-y-3">
                    ${Array.from(followedCongressPeople).map(name => `
                        <div class="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                            <div class="flex items-center space-x-3">
                                <i class="bi bi-star-fill text-emerald-500"></i>
                                <span class="font-medium text-gray-900 dark:text-gray-100">${name}</span>
                            </div>
                            <button onclick="toggleFollowCongressPerson('${name}', event)" class="text-emerald-600 hover:text-emerald-700 transition-colors">
                                <i class="bi bi-x-circle"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
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
