// Global variables
let sidebarCollapsed = false;
let followedCongressPeople = new Set(JSON.parse(localStorage.getItem('followedCongressPeople') || '[]'));

// Page loader functionality
async function loadPageContent(pageName) {
    try {
        // First try to load from HTML file
        const response = await fetch(`pages/${pageName}.html`);
        if (response.ok) {
            const content = await response.text();
            return content;
        } else {
            throw new Error(`Failed to load ${pageName}.html`);
        }
    } catch (error) {
        console.warn(`Could not load ${pageName}.html, using fallback content:`, error);
        
        // Fallback to inline content
        const pageMap = {
            'home-dashboard': getHomeDashboardContent,
            'inside-the-capitol': getInsideTheCapitolContent,
            'market-analysis': getMarketAnalysisContent,
            'company-research': getCompanyResearchContent,
            'economic-indicators': getEconomicIndicatorsContent,
            'watchlist': getWatchlistContent,
            'community': getCommunityContent,
            'financial-analytics': getFinancialAnalyticsContent
        };

        const contentFunction = pageMap[pageName];
        if (contentFunction) {
            return contentFunction();
        } else {
            return `<div class="text-center py-16"><h1 class="text-2xl font-bold text-gray-900 dark:text-white">Page not found</h1></div>`;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize theme
    initializeTheme();
    
    // Initialize sidebar
    initializeSidebar();
    
    // Show loading for 2 seconds, then show landing page
    setTimeout(() => {
        hideLoading();
        showLandingPage();
    }, 2000);
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark');
        themeIcon.className = 'bi bi-sun-fill';
    } else {
        themeIcon.className = 'bi bi-moon-fill';
    }
}

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        themeIcon.className = 'bi bi-moon-fill';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark');
        themeIcon.className = 'bi bi-sun-fill';
        localStorage.setItem('theme', 'dark');
    }
}

function initializeSidebar() {
    const sidebarCollapsedState = localStorage.getItem('sidebarCollapsed') === 'true';
    
    if (sidebarCollapsedState) {
        collapseSidebar();
    }
    
    if (window.innerWidth <= 768) {
        setupMobileSidebar();
    }
}

function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.style.transform = 'translateX(-100%)';
    sidebar.classList.remove('sidebar-open');
}

function toggleSidebar() {
    if (window.innerWidth <= 768) {
        toggleMobileSidebar();
    } else {
        if (sidebarCollapsed) {
            expandSidebar();
        } else {
            collapseSidebar();
        }
    }
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isOpen = sidebar.classList.contains('sidebar-open');
    
    if (isOpen) {
        closeSidebarMobile();
    } else {
        openSidebarMobile();
    }
}

function openSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.add('sidebar-open');
    sidebar.style.transform = 'translateX(0)';
    overlay.classList.add('active');
}

function closeSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.remove('sidebar-open');
    sidebar.style.transform = 'translateX(-100%)';
    overlay.classList.remove('active');
}

function collapseSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const toggleCollapsedBtn = document.getElementById('sidebar-toggle-collapsed');
    
    sidebar.style.width = '0px';
    sidebar.style.overflow = 'hidden';
    mainContent.style.marginLeft = '0px';
    toggleBtn.style.display = 'none';
    toggleCollapsedBtn.classList.remove('hidden');
    
    sidebarCollapsed = true;
    localStorage.setItem('sidebarCollapsed', 'true');
}

function expandSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const toggleCollapsedBtn = document.getElementById('sidebar-toggle-collapsed');
    
    sidebar.style.width = '280px';
    sidebar.style.overflow = 'visible';
    mainContent.style.marginLeft = '280px';
    toggleBtn.style.display = 'block';
    toggleCollapsedBtn.classList.add('hidden');
    
    sidebarCollapsed = false;
    localStorage.setItem('sidebarCollapsed', 'false');
}

function handleResize() {
    if (window.innerWidth <= 768) {
        setupMobileSidebar();
    } else {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar.style.transform = '';
        sidebar.classList.remove('sidebar-open');
        overlay.classList.remove('active');
    }
}

// Tab switching functionality
function switchTab(tabName) {
    // Remove active state from all tabs
    document.querySelectorAll('[id^="nav-"]').forEach(tab => {
        tab.classList.remove('bg-amber-50', 'dark:bg-amber-900/20', 'border-amber-200', 'dark:border-amber-800', 'text-amber-700', 'dark:text-amber-300');
        tab.classList.add('hover:bg-gray-50', 'dark:hover:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
    });

    // Add active state to selected tab
    const selectedTab = document.getElementById(`nav-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.remove('hover:bg-gray-50', 'dark:hover:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
        selectedTab.classList.add('bg-amber-50', 'dark:bg-amber-900/20', 'border-amber-200', 'dark:border-amber-800', 'text-amber-700', 'dark:text-amber-300');
    }

    // Handle tab content switching
    switch(tabName) {
        case 'home':
            showHomeDashboard();
            break;
        case 'inside-the-capitol':
            showInsideTheCapitol();
            break;
        case 'market-analysis':
            showMarketAnalysis();
            break;
        case 'company-research':
            showCompanyResearch();
            break;
        case 'economic-indicators':
            showEconomicIndicators();
            break;
        case 'watchlists':
            showWatchlists();
            break;
        case 'community':
            showCommunity();
            break;
        case 'financial-analytics':
            showFinancialAnalytics();
            break;
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function hideAllContent() {
    const contents = ['landing-page', 'dynamic-content'];
    contents.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
}

function showLandingPage() {
    hideAllContent();
    document.getElementById('landing-page').style.display = 'block';
    
    // Hide sidebar for landing page
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('main-content').style.marginLeft = '0';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showHomeDashboard() {
    hideAllContent();
    
    // Show sidebar for dashboard
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    // Load home dashboard page
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    const content = await loadPageContent('home-dashboard');
    dynamicContent.innerHTML = content;
    
    // Initialize page-specific functionality
    await initializePageFunctionality('home-dashboard');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showInsideTheCapitol() {
    hideAllContent();
    
    // Show sidebar for inside the capitol
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    const content = await loadPageContent('inside-the-capitol');
    dynamicContent.innerHTML = content;
    
    // Initialize page-specific functionality
    await initializePageFunctionality('inside-the-capitol');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Congress Trading Variables
let congressTradingData = [];
let currentCongressPage = 1;
let congressTradesPerPage = 10;
let currentCongressFilter = 'all';

async function initializeCongressTradingData() {
    showCongressTradingLoading();
    await fetchCongressionalTradingData();
}

function showCongressTradingLoading() {
    const tbody = document.getElementById('congressTradingTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8">
                    <div class="flex flex-col items-center space-y-3">
                        <div class="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-gray-600 dark:text-gray-400">Loading congressional trading data...</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

async function fetchCongressionalTradingData() {
    try {
        const response = await fetch('/MarketResearch/API/Quiver/CongressionalTrading?limit=100');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const trades = await response.json();
        
        if (trades && trades.length > 0) {
            congressTradingData = trades.map(trade => ({
                date: new Date(trade.tradeDate),
                congresspersonName: trade.congressPersonName,
                party: getFullPartyName(trade.party),
                companyName: trade.companyName,
                ticker: trade.ticker,
                tradeType: trade.tradeType.charAt(0).toUpperCase() + trade.tradeType.slice(1),
                tradeValue: trade.amount,
                chamber: trade.chamber || 'Unknown'
            }));
            
            congressTradingData.sort((a, b) => b.date - a.date);
            
            updateCongressCardSummary();
            renderCongressTradingTable();
            updateCongressPagination();
            
            console.log(`Successfully loaded ${congressTradingData.length} congressional trades`);
        }
    } catch (error) {
        console.error('Error fetching congressional trading data:', error);
        showCongressTradingError('Failed to load data. Please try again.');
    }
}

function updateCongressCardSummary() {
    if (congressTradingData.length > 0) {
        const totalTrades = congressTradingData.length;
        const totalVolume = congressTradingData.reduce((sum, trade) => sum + trade.tradeValue, 0);
        const activeTraders = new Set(congressTradingData.map(trade => trade.congresspersonName)).size;
        const lastUpdated = new Date().toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        document.getElementById('congressTotalTrades').textContent = totalTrades.toLocaleString();
        document.getElementById('congressTotalVolume').textContent = formatCurrency(totalVolume);
        document.getElementById('congressActiveTraders').textContent = activeTraders.toLocaleString();
        document.getElementById('congressLastUpdated').textContent = lastUpdated;
    }
}

function showCongressTradingError(message) {
    const tbody = document.getElementById('congressTradingTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8">
                    <div class="flex flex-col items-center space-y-3">
                        <div class="w-6 h-6 text-red-500">
                            <i class="bi bi-exclamation-triangle-fill"></i>
                        </div>
                        <p class="text-red-600 dark:text-red-400">${message}</p>
                        <button onclick="fetchCongressionalTradingData()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
                            Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function getFullPartyName(partyCode) {
    switch (partyCode?.toUpperCase()) {
        case 'D': return 'Democrat';
        case 'R': return 'Republican';
        case 'I': return 'Independent';
        default: return 'Unknown';
    }
}

function toggleCongressTradingExpansion() {
    const card = document.getElementById('historicalCongressTradingCard');
    const content = document.getElementById('congressTradingExpandedContent');
    const isExpanded = card.classList.contains('expanded');
    
    if (isExpanded) {
        card.classList.remove('expanded');
        content.classList.remove('expanded');
        content.classList.add('hidden');
    } else {
        card.classList.add('expanded');
        content.classList.remove('hidden');
        
        if (congressTradingData.length === 0) {
            initializeCongressTradingData();
        }
        
        setTimeout(() => {
            content.classList.add('expanded');
        }, 10);
    }
}

function renderCongressTradingTable() {
    const tbody = document.getElementById('congressTradingTableBody');
    if (!tbody) return;
    
    const filteredData = filterCongressTradingData();
    const startIndex = (currentCongressPage - 1) * congressTradesPerPage;
    const endIndex = startIndex + congressTradesPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8 text-gray-500 dark:text-gray-400">
                    No trades found matching the current filter.
                </td>
            </tr>
        `;
        return;
    }

    pageData.forEach(trade => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-amber-50 dark:hover:bg-amber-900/20';
        
        const partyClass = getPartyClass(trade.party);
        const tradeTypeClass = getTradeTypeClass(trade.tradeType);
        
        const tradeDate = trade.date ? formatDate(trade.date) : 'N/A';
        const congresspersonName = trade.congresspersonName || 'Unknown';
        const party = trade.party || 'Unknown';
        const companyName = trade.companyName || 'Unknown';
        const ticker = trade.ticker || 'N/A';
        const tradeType = trade.tradeType || 'Unknown';
        const tradeValue = trade.tradeValue ? formatCurrency(trade.tradeValue) : 'N/A';
        
        const isFollowed = followedCongressPeople.has(congresspersonName);
        const starIcon = isFollowed ? 'bi-star-fill' : 'bi-star';
        const starColor = isFollowed ? 'text-amber-500' : 'text-amber-400';
        
        row.innerHTML = `
            <td class="text-gray-700 dark:text-gray-300">${tradeDate}</td>
            <td class="text-center">
                <button onclick="toggleFollowCongressPerson('${congresspersonName}', event)" 
                        class="p-1 hover:scale-110 transition-transform duration-200" 
                        title="${isFollowed ? 'Unfollow' : 'Follow'} ${congresspersonName}">
                    <i class="bi ${starIcon} ${starColor} text-lg"></i>
                </button>
            </td>
            <td class="text-gray-900 dark:text-gray-100 font-medium">${congresspersonName}</td>
            <td class="${partyClass}">${party}</td>
            <td class="text-gray-700 dark:text-gray-300">${companyName}</td>
            <td class="text-gray-900 dark:text-gray-100 font-mono">${ticker}</td>
            <td class="${tradeTypeClass}">${tradeType}</td>
            <td class="text-right text-gray-900 dark:text-gray-100 font-semibold">${tradeValue}</td>
        `;
        
        tbody.appendChild(row);
    });

    updateCongressPagination();
}

function filterCongressTradingData() {
    if (currentCongressFilter === 'all') {
        return congressTradingData;
    }
    
    return congressTradingData.filter(trade => {
        const tradeType = trade.tradeType?.toLowerCase() || '';
        const filterType = currentCongressFilter.toLowerCase();
        
        if (filterType === 'buy' && (tradeType === 'buy' || tradeType === 'purchase')) {
            return true;
        }
        if (filterType === 'sell' && (tradeType === 'sell' || tradeType === 'sale')) {
            return true;
        }
        
        return false;
    });
}

function filterCongressTrades(event, filter) {
    event.stopPropagation();
    
    currentCongressFilter = filter;
    currentCongressPage = 1;
    
    document.querySelectorAll('[id^="filter-"]').forEach(btn => {
        btn.className = 'px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full border border-gray-300 dark:border-gray-600';
    });
    
    const activeButton = document.getElementById(`filter-${filter}`);
    if (activeButton) {
        activeButton.className = 'px-3 py-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full border border-amber-300 dark:border-amber-600';
    }
    
    renderCongressTradingTable();
}

function changeCongressPage(event, direction) {
    event.stopPropagation();
    
    const filteredData = filterCongressTradingData();
    const totalPages = Math.ceil(filteredData.length / congressTradesPerPage);
    
    currentCongressPage += direction;
    
    if (currentCongressPage < 1) currentCongressPage = 1;
    if (currentCongressPage > totalPages) currentCongressPage = totalPages;
    
    renderCongressTradingTable();
}

function updateCongressPagination() {
    const filteredData = filterCongressTradingData();
    const totalPages = Math.ceil(filteredData.length / congressTradesPerPage);
    const startIndex = (currentCongressPage - 1) * congressTradesPerPage + 1;
    const endIndex = Math.min(currentCongressPage * congressTradesPerPage, filteredData.length);
    
    const startEl = document.getElementById('congressTradesStart');
    const endEl = document.getElementById('congressTradesEnd');
    const totalEl = document.getElementById('congressTradesTotal');
    const prevBtn = document.getElementById('congressPrevPage');
    const nextBtn = document.getElementById('congressNextPage');
    
    if (startEl) startEl.textContent = startIndex;
    if (endEl) endEl.textContent = endIndex;
    if (totalEl) totalEl.textContent = filteredData.length;
    
    if (prevBtn) prevBtn.disabled = currentCongressPage <= 1;
    if (nextBtn) nextBtn.disabled = currentCongressPage >= totalPages;
}

function toggleFollowCongressPerson(congressPersonName, event) {
    event.stopPropagation();
    
    const isCurrentlyFollowed = followedCongressPeople.has(congressPersonName);
    
    if (isCurrentlyFollowed) {
        followedCongressPeople.delete(congressPersonName);
        showNotification(`${congressPersonName} removed from your watchlist`, 'unfollow');
    } else {
        followedCongressPeople.add(congressPersonName);
        showNotification(`You are now following ${congressPersonName}!`, 'success');
    }
    
    localStorage.setItem('followedCongressPeople', JSON.stringify(Array.from(followedCongressPeople)));
    
    renderCongressTradingTable();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-2 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full notification-thin`;
    
    if (type === 'unfollow') {
        notification.className += ' bg-red-500 text-white border-2 border-red-600';
    } else {
        notification.className += ' amber-popup text-white font-semibold';
    }
    
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'unfollow' ? 'bi-person-x' : 'bi-info-circle'}"></i>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

function refreshCongressData(event) {
    event.stopPropagation();
    showCongressTradingLoading();
    fetchCongressionalTradingData();
}

function getPartyClass(party) {
    switch (party.toLowerCase()) {
        case 'democrat': return 'party-democrat';
        case 'republican': return 'party-republican';
        case 'independent': return 'party-independent';
        default: return '';
    }
}

function getTradeTypeClass(tradeType) {
    switch (tradeType.toLowerCase()) {
        case 'buy': return 'trade-type-buy';
        case 'sell': return 'trade-type-sell';
        case 'option': return 'trade-type-option';
        default: return '';
    }
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Other tab functions
async function showMarketAnalysis() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    await pageLoader.renderPage('market-analysis');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showCompanyResearch() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    await pageLoader.renderPage('company-research');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showEconomicIndicators() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    await pageLoader.renderPage('economic-indicators');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showWatchlists() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    await pageLoader.renderPage('watchlist');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderFollowingSection() {
    if (followedCongressPeople.size === 0) {
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
                    <div class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div class="flex items-center space-x-3">
                            <i class="bi bi-star-fill text-amber-500"></i>
                            <span class="font-medium text-gray-900 dark:text-gray-100">${name}</span>
                        </div>
                        <button onclick="toggleFollowCongressPerson('${name}', event)" class="text-amber-600 hover:text-amber-700 transition-colors">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

async function showMarketAnalysis() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    const content = await loadPageContent('market-analysis');
    dynamicContent.innerHTML = content;
    
    // Initialize page-specific functionality
    await initializePageFunctionality('market-analysis');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showCompanyResearch() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    const content = await loadPageContent('company-research');
    dynamicContent.innerHTML = content;
    
    // Initialize page-specific functionality
    await initializePageFunctionality('company-research');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showEconomicIndicators() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    const content = await loadPageContent('economic-indicators');
    dynamicContent.innerHTML = content;
    
    // Initialize page-specific functionality
    await initializePageFunctionality('economic-indicators');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showWatchlists() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    const content = await loadPageContent('watchlist');
    dynamicContent.innerHTML = content;
    
    // Initialize page-specific functionality
    await initializePageFunctionality('watchlist');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showCommunity() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    const content = await loadPageContent('community');
    dynamicContent.innerHTML = content;
    
    // Initialize page-specific functionality
    await initializePageFunctionality('community');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showFinancialAnalytics() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    const content = await loadPageContent('financial-analytics');
    dynamicContent.innerHTML = content;
    
    // Initialize page-specific functionality
    await initializePageFunctionality('financial-analytics');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Page initialization function
async function initializePageFunctionality(pageName) {
    switch (pageName) {
        case 'home-dashboard':
            initializePortfolioPage();
            break;
        case 'inside-the-capitol':
            await initializeCongressTradingData();
            break;
        case 'financial-analytics':
            await loadFinancialHealthData();
            break;
        case 'market-analysis':
            console.log('Market analysis page initialized');
            break;
        case 'company-research':
            console.log('Company research page initialized');
            break;
        case 'economic-indicators':
            console.log('Economic indicators page initialized');
            break;
        case 'watchlist':
            console.log('Watchlist page initialized');
            break;
        case 'community':
            console.log('Community page initialized');
            break;
        default:
            console.log(`No initialization needed for ${pageName}`);
    }
}

// Page content functions
function getHomeDashboardContent() {
    return `
        <div class="container mx-auto px-4 py-8">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Portfolio Dashboard</h1>
                    <p class="text-gray-600 dark:text-gray-400 mt-2">Track your investments and financial performance</p>
                </div>
                <div class="flex items-center space-x-4">
                    <button onclick="refreshPortfolioData()" class="btn btn-primary">
                        <i class="bi bi-arrow-clockwise mr-2"></i>Refresh
                    </button>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        Last updated: <span id="portfolio-last-updated">Just now</span>
                    </div>
                </div>
            </div>

            <!-- Portfolio Overview Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="card card-content">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">$127,843.52</p>
                            <p class="text-sm text-emerald-600 dark:text-emerald-400">+2.28% today</p>
                        </div>
                        <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-wallet2 text-emerald-600 dark:text-emerald-400 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="card card-content">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Today's P&L</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">+$847.31</p>
                            <p class="text-sm text-emerald-600 dark:text-emerald-400">+0.67%</p>
                        </div>
                        <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-graph-up-arrow text-blue-600 dark:text-blue-400 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="card card-content">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Monthly Dividends</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">$342.18</p>
                            <p class="text-sm text-emerald-600 dark:text-emerald-400">+9.07%</p>
                        </div>
                        <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-cash-coin text-purple-600 dark:text-purple-400 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="card card-content">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Risk Score</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">7.2/10</p>
                            <p class="text-sm text-yellow-600 dark:text-yellow-400">Moderate</p>
                        </div>
                        <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-shield-check text-yellow-600 dark:text-yellow-400 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detailed Portfolio Cards -->
            <div class="portfolio-grid">
                <!-- Total Portfolio Value Expandable Card -->
                <div class="dashboard-card expandable-portfolio" data-type="portfolio-value">
                    <div class="dashboard-card-header" onclick="togglePortfolioExpansion(event)">
                        <h3 class="dashboard-card-title">Total Portfolio Value</h3>
                        <div class="dashboard-card-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                            <i class="bi bi-wallet2 text-xl"></i>
                        </div>
                        <div class="dashboard-card-toggle">
                            <i class="bi bi-chevron-down text-lg transition-transform duration-200"></i>
                        </div>
                    </div>
                    <div class="dashboard-card-value">$127,843.52</div>
                    <div class="dashboard-card-change positive">
                        <i class="bi bi-arrow-up"></i>
                        +$2,847.31 (+2.28%)
                    </div>
                    <div class="dashboard-card-description">Updated 2 minutes ago</div>
                    
                    <!-- Portfolio Chart Content -->
                    <div class="portfolio-chart-content hidden" id="portfolio-chart-content">
                        <div class="portfolio-chart-controls">
                            <div class="time-period-selector">
                                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period:</label>
                                <select id="portfolio-time-period" onchange="updatePortfolioChart()" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-200">
                                    <option value="3">3 Months</option>
                                    <option value="6">6 Months</option>
                                    <option value="12" selected>12 Months</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Top 3 Holdings Section -->
                        <div class="top-holdings-section mt-6">
                            <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Top 3 Holdings</h4>
                            <div class="holdings-grid">
                                <div class="holding-card">
                                    <div class="holding-header">
                                        <div class="holding-symbol">AAPL</div>
                                        <div class="holding-name">Apple Inc.</div>
                                    </div>
                                    <div class="holding-details">
                                        <div class="holding-shares">25 shares</div>
                                        <div class="holding-value">$4,375.00</div>
                                    </div>
                                    <div class="holding-return">
                                        <span class="return-label">Return:</span>
                                        <span class="return-value positive">+$875.00 (+25.0%)</span>
                                    </div>
                                </div>
                                
                                <div class="holding-card">
                                    <div class="holding-header">
                                        <div class="holding-symbol">TSLA</div>
                                        <div class="holding-name">Tesla Inc.</div>
                                    </div>
                                    <div class="holding-details">
                                        <div class="holding-shares">15 shares</div>
                                        <div class="holding-value">$3,150.00</div>
                                    </div>
                                    <div class="holding-return">
                                        <span class="return-label">Return:</span>
                                        <span class="return-value positive">+$630.00 (+25.0%)</span>
                                    </div>
                                </div>
                                
                                <div class="holding-card">
                                    <div class="holding-header">
                                        <div class="holding-symbol">MSFT</div>
                                        <div class="holding-name">Microsoft Corp.</div>
                                    </div>
                                    <div class="holding-details">
                                        <div class="holding-shares">20 shares</div>
                                        <div class="holding-value">$7,600.00</div>
                                    </div>
                                    <div class="holding-return">
                                        <span class="return-label">Return:</span>
                                        <span class="return-value positive">+$1,520.00 (+25.0%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="portfolio-chart-container mt-6">
                            <canvas id="portfolio-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Asset Allocation Card -->
                <div class="dashboard-card expandable-asset-allocation" data-type="asset-allocation">
                    <div class="dashboard-card-header" onclick="toggleAssetAllocationExpansion(event)">
                        <h3 class="dashboard-card-title">Asset Allocation</h3>
                        <div class="dashboard-card-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                            <i class="bi bi-pie-chart text-xl"></i>
                        </div>
                        <div class="dashboard-card-toggle">
                            <i class="bi bi-chevron-down text-lg transition-transform duration-200"></i>
                        </div>
                    </div>
                    <div class="dashboard-card-value">Diversified</div>
                    <div class="dashboard-card-change positive">
                        <i class="bi bi-check-circle"></i>
                        Well balanced
                    </div>
                    <div class="dashboard-card-description">Stocks: 65% | Bonds: 20% | Cash: 15%</div>
                    
                    <!-- Asset Allocation Chart Content -->
                    <div class="asset-allocation-chart-content hidden" id="asset-allocation-chart-content">
                        <div class="chart-controls">
                            <div class="breakdown-selector">
                                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Breakdown Type:</label>
                                <select id="breakdown-type" onchange="updateAssetAllocationChart()" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-gray-200">
                                    <option value="asset-class" selected>Asset Class</option>
                                    <option value="sector">Sector</option>
                                    <option value="performance">Performance</option>
                                </select>
                            </div>
                        </div>
                        <div class="chart-and-insights-container mt-6">
                            <div class="asset-allocation-chart-container">
                                <canvas id="asset-allocation-chart" width="800" height="400"></canvas>
                            </div>
                            <div class="insights-container">
                                <h4 class="insights-title">Market Insights & Analysis</h4>
                                <div class="insights-content">
                                    <div class="chart-summary">
                                        <h5 class="summary-title">Chart Summary</h5>
                                        <p id="chart-summary-text" class="summary-text">Your portfolio shows a balanced allocation with strong diversification across asset classes.</p>
                                    </div>
                                    <div class="market-news">
                                        <h5 class="news-title">Recent Market News</h5>
                                        <div id="market-news-content" class="news-content">
                                            <div class="news-item">Federal Reserve maintains interest rates, supporting equity markets</div>
                                            <div class="news-item">Tech sector shows resilience amid market volatility</div>
                                            <div class="news-item">Energy stocks outperform as oil prices stabilize</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Top Performers Card -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">Top Performer</h3>
                        <div class="dashboard-card-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                            <i class="bi bi-star-fill text-xl"></i>
                        </div>
                    </div>
                    <div class="dashboard-card-value">TSLA</div>
                    <div class="dashboard-card-change positive">
                        <i class="bi bi-arrow-up"></i>
                        +$156.42 (+8.45%)
                    </div>
                    <div class="dashboard-card-description">Tesla Inc. - 15 shares</div>
                </div>

                <!-- Risk Score Card -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">Risk Score</h3>
                        <div class="dashboard-card-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                            <i class="bi bi-shield-check text-xl"></i>
                        </div>
                    </div>
                    <div class="dashboard-card-value">7.2/10</div>
                    <div class="dashboard-card-change positive">
                        <i class="bi bi-arrow-down"></i>
                        -0.3 from last week
                    </div>
                    <div class="dashboard-card-description">Moderate risk profile</div>
                </div>

                <!-- Profit/Loss Card -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">Profit & Loss</h3>
                        <div class="dashboard-card-icon" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                            <i class="bi bi-graph-up-arrow text-xl"></i>
                        </div>
                    </div>
                    <div class="dashboard-card-value">+$12,456</div>
                    <div class="dashboard-card-change positive">
                        <i class="bi bi-arrow-up"></i>
                        +10.8% this quarter
                    </div>
                    <div class="dashboard-card-description">Unrealized gains included</div>
                </div>

                <!-- Market Performance Card -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">Market Performance</h3>
                        <div class="dashboard-card-icon" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
                            <i class="bi bi-graph-up text-xl"></i>
                        </div>
                    </div>
                    <div class="dashboard-card-value">S&P 500</div>
                    <div class="dashboard-card-change positive">
                        <i class="bi bi-arrow-up"></i>
                        +1.24% today
                    </div>
                    <div class="dashboard-card-description">4,567.89 (+56.78)</div>
                </div>
            </div>

            <!-- Recent Transactions Section -->
            <div class="mt-12">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Recent Transactions</h2>
                    <button class="text-emerald-600 hover:text-emerald-700 font-medium">View All</button>
                </div>
                
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div class="divide-y divide-gray-200 dark:divide-gray-700">
                        <div class="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                            <div class="flex items-center space-x-4">
                                <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                                    <i class="bi bi-arrow-up text-emerald-600 dark:text-emerald-400"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900 dark:text-white">AAPL Purchase</div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">Apple Inc. • 10 shares</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-semibold text-gray-900 dark:text-white">$1,750.00</div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">2 hours ago</div>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                            <div class="flex items-center space-x-4">
                                <div class="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                                    <i class="bi bi-arrow-down text-red-600 dark:text-red-400"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900 dark:text-white">MSFT Sale</div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">Microsoft Corp. • 5 shares</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-semibold text-gray-900 dark:text-white">$1,920.00</div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">1 day ago</div>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                            <div class="flex items-center space-x-4">
                                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                    <i class="bi bi-cash text-blue-600 dark:text-blue-400"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900 dark:text-white">Dividend Payment</div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">Johnson & Johnson</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-semibold text-emerald-600 dark:text-emerald-400">+$45.20</div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">3 days ago</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions Section -->
            <div class="mt-12">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:shadow-lg transition-all duration-200 group">
                        <div class="flex flex-col items-center space-y-3">
                            <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                                <i class="bi bi-plus text-emerald-600 dark:text-emerald-400 group-hover:text-white text-xl"></i>
                            </div>
                            <span class="font-medium text-gray-900 dark:text-white">Add Investment</span>
                        </div>
                    </button>
                    
                    <button class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:shadow-lg transition-all duration-200 group">
                        <div class="flex flex-col items-center space-y-3">
                            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                <i class="bi bi-graph-up text-blue-600 dark:text-blue-400 group-hover:text-white text-xl"></i>
                            </div>
                            <span class="font-medium text-gray-900 dark:text-white">View Analytics</span>
                        </div>
                    </button>
                    
                    <button class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:shadow-lg transition-all duration-200 group">
                        <div class="flex flex-col items-center space-y-3">
                            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                                <i class="bi bi-gear text-purple-600 dark:text-purple-400 group-hover:text-white text-xl"></i>
                            </div>
                            <span class="font-medium text-gray-900 dark:text-white">Settings</span>
                        </div>
                    </button>
                    
                    <button onclick="switchTab('inside-the-capitol')" class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:shadow-lg transition-all duration-200 group">
                        <div class="flex flex-col items-center space-y-3">
                            <div class="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                                <i class="bi bi-building text-amber-600 dark:text-amber-400 group-hover:text-white text-xl"></i>
                            </div>
                            <span class="font-medium text-gray-900 dark:text-white">Capitol Insights</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getInsideTheCapitolContent() {
    return `
        <div class="container mx-auto px-4 py-8">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">Inside the Capitol</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">Real-time insights into congressional trading, government contracts, and lobbying activities</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <!-- Congressional Trading Card -->
                <div id="historicalCongressTradingCard" class="bg-emerald-50 dark:bg-emerald-950 rounded-xl shadow-md p-6 border-2 border-emerald-500 cursor-pointer transition-all duration-300 hover:shadow-lg" onclick="toggleCongressTradingExpansion()">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Congressional Trading</h3>
                        <div class="flex items-center space-x-3">
                            <button id="refreshCongressData" onclick="refreshCongressData(event)" class="p-1 text-emerald-600 hover:text-emerald-700 transition-colors" title="Refresh data">
                                <i class="bi bi-arrow-clockwise text-sm"></i>
                            </button>
                            <div id="congressApiStatus" class="w-2 h-2 bg-emerald-500 rounded-full" title="API Connected"></div>
                            <div class="congress-toggle-icon text-emerald-600 dark:text-emerald-400 transition-transform duration-200">
                                <i class="bi bi-chevron-down text-lg"></i>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Total Trades:</span>
                            <span id="congressTotalTrades" class="font-semibold text-gray-900 dark:text-gray-100">1,247</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Total Volume:</span>
                            <span id="congressTotalVolume" class="font-semibold text-gray-900 dark:text-gray-100">$45.2M</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Active Traders:</span>
                            <span id="congressActiveTraders" class="font-semibold text-gray-900 dark:text-gray-100">89</span>
                        </div>
                    </div>
                    
                    <!-- Expandable Content -->
                    <div id="congressTradingExpandedContent" class="congress-expanded-content hidden mt-6 pt-6 border-t border-emerald-200 dark:border-emerald-800" onclick="event.stopPropagation()">
                        <div class="mb-4">
                            <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Congressional Trading History</h4>
                            <div class="flex flex-wrap gap-2 mb-4">
                                <button id="filter-all" class="px-3 py-1 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full border border-emerald-300 dark:border-emerald-600" onclick="filterCongressTrades(event, 'all')">All Trades</button>
                                <button id="filter-buy" class="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full border border-gray-300 dark:border-gray-600" onclick="filterCongressTrades(event, 'buy')">Buy</button>
                                <button id="filter-sell" class="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full border border-gray-300 dark:border-gray-600" onclick="filterCongressTrades(event, 'sell')">Sell</button>
                            </div>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b border-emerald-200 dark:border-emerald-800">
                                        <th class="text-left py-2 px-3 text-emerald-700 dark:text-emerald-300 font-semibold">Date</th>
                                        <th class="text-left py-2 px-3 text-emerald-700 dark:text-emerald-300 font-semibold">Follow</th>
                                        <th class="text-left py-2 px-3 text-emerald-700 dark:text-emerald-300 font-semibold">Congress Person</th>
                                        <th class="text-left py-2 px-3 text-emerald-700 dark:text-emerald-300 font-semibold">Party</th>
                                        <th class="text-left py-2 px-3 text-emerald-700 dark:text-emerald-300 font-semibold">Company</th>
                                        <th class="text-left py-2 px-3 text-emerald-700 dark:text-emerald-300 font-semibold">Ticker</th>
                                        <th class="text-left py-2 px-3 text-emerald-700 dark:text-emerald-300 font-semibold">Trade Type</th>
                                        <th class="text-right py-2 px-3 text-emerald-700 dark:text-emerald-300 font-semibold">Amount</th>
                                    </tr>
                                </thead>
                                <tbody id="congressTradingTableBody">
                                    <!-- Table rows will be populated dynamically -->
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="flex justify-between items-center mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
                            <div class="text-sm text-gray-600 dark:text-gray-400">
                                Showing <span id="congressTradesStart">1</span> to <span id="congressTradesEnd">10</span> of <span id="congressTradesTotal">0</span> trades
                            </div>
                            <div class="flex space-x-2">
                                <button id="congressPrevPage" class="px-3 py-1 text-sm bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded border border-emerald-300 dark:border-emerald-600 disabled:opacity-50" onclick="changeCongressPage(event, -1)">Previous</button>
                                <button id="congressNextPage" class="px-3 py-1 text-sm bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded border border-emerald-300 dark:border-emerald-600 disabled:opacity-50" onclick="changeCongressPage(event, 1)">Next</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Government Contracts Card -->
                <div class="bg-blue-50 dark:bg-blue-950 rounded-xl shadow-md p-6 border-2 border-blue-500">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Government Contracts</h3>
                        <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Total Contracts:</span>
                            <span class="font-semibold text-gray-900 dark:text-gray-100">567</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Total Value:</span>
                            <span class="font-semibold text-gray-900 dark:text-gray-100">$1.2B</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Active Companies:</span>
                            <span class="font-semibold text-gray-900 dark:text-gray-100">234</span>
                        </div>
                    </div>
                </div>

                <!-- Lobbying Activity Card -->
                <div class="bg-orange-50 dark:bg-orange-950 rounded-xl shadow-md p-6 border-2 border-orange-500">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Lobbying Activity</h3>
                        <div class="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Total Reports:</span>
                            <span class="font-semibold text-gray-900 dark:text-gray-100">1,234</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Total Spending:</span>
                            <span class="font-semibold text-gray-900 dark:text-gray-100">$89M</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Active Firms:</span>
                            <span class="font-semibold text-gray-900 dark:text-gray-100">89</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getMarketAnalysisContent() {
    return `
        <div class="container mx-auto px-4 py-8">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">Market Analysis</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">Advanced market analysis tools and comprehensive insights</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">S&P 500</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">4,567.89</p>
                            <p class="text-sm text-emerald-600 dark:text-emerald-400">+1.24% (+56.78)</p>
                        </div>
                        <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-graph-up text-blue-600 dark:text-blue-400 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">NASDAQ</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">14,234.12</p>
                            <p class="text-sm text-emerald-600 dark:text-emerald-400">+0.89% (+125.45)</p>
                        </div>
                        <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-graph-up text-emerald-600 dark:text-emerald-400 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">VIX</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">18.45</p>
                            <p class="text-sm text-red-600 dark:text-red-400">-2.1% (-0.39)</p>
                        </div>
                        <div class="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-graph-down text-red-600 dark:text-red-400 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">10Y Treasury</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">4.23%</p>
                            <p class="text-sm text-gray-600 dark:text-gray-400">+0.02% (+2bps)</p>
                        </div>
                        <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-graph-up text-yellow-600 dark:text-yellow-400 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getCompanyResearchContent() {
    return `
        <div class="container mx-auto px-4 py-8">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">Company Research</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">Comprehensive company analysis and research tools</p>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Company Search & Analysis</h3>
                
                <div class="flex flex-col md:flex-row gap-4">
                    <div class="flex-1">
                        <input type="text" id="company-search" placeholder="Search by company name or ticker symbol (e.g., AAPL, Tesla)" 
                               class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white">
                    </div>
                    <button onclick="searchCompany()" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium">
                        <i class="bi bi-search mr-2"></i>Analyze Company
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <div class="text-center">
                        <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-500 transition-colors">
                            <i class="bi bi-graph-up text-emerald-600 dark:text-emerald-400 group-hover:text-white text-xl"></i>
                        </div>
                        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Stock Screener</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Filter stocks by criteria</p>
                    </div>
                </div>
                
                <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <div class="text-center">
                        <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-500 transition-colors">
                            <i class="bi bi-calculator text-blue-600 dark:text-blue-400 group-hover:text-white text-xl"></i>
                        </div>
                        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Valuation Models</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">DCF & comparable analysis</p>
                    </div>
                </div>
                
                <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <div class="text-center">
                        <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-500 transition-colors">
                            <i class="bi bi-bar-chart text-purple-600 dark:text-purple-400 group-hover:text-white text-xl"></i>
                        </div>
                        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Peer Analysis</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Compare with competitors</p>
                    </div>
                </div>
                
                <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <div class="text-center">
                        <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-500 transition-colors">
                            <i class="bi bi-file-earmark-bar-graph text-orange-600 dark:text-orange-400 group-hover:text-white text-xl"></i>
                        </div>
                        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Earnings Analysis</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Historical & projected earnings</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getEconomicIndicatorsContent() {
    return `
        <div class="container mx-auto px-4 py-8">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-4">Economic Indicators</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">Key economic data and market indicators driving investment decisions</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Inflation Rate</h3>
                        <div class="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-graph-up text-red-600 dark:text-red-400"></i>
                        </div>
                    </div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-white mb-2">3.2%</div>
                    <div class="text-sm text-red-600 dark:text-red-400">+0.1% from last month</div>
                </div>

                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Unemployment</h3>
                        <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-people text-emerald-600 dark:text-emerald-400"></i>
                        </div>
                    </div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-white mb-2">3.7%</div>
                    <div class="text-sm text-emerald-600 dark:text-emerald-400">-0.2% from last month</div>
                </div>

                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">GDP Growth</h3>
                        <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <i class="bi bi-graph-down text-blue-600 dark:text-blue-400"></i>
                        </div>
                    </div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-white mb-2">2.8%</div>
                    <div class="text-sm text-emerald-600 dark:text-emerald-400">+0.3% quarterly</div>
                </div>
            </div>
        </div>
    `;
}

function getWatchlistContent() {
    return `
        <div class="container mx-auto px-4 py-8">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">Watchlists</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">Track your favorite congress people, stocks, and investment opportunities</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">People I'm Following</h3>
                        <button onclick="switchTab('inside-the-capitol')" class="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                            Add More
                        </button>
                    </div>
                    
                    <div id="following-section">
                        ${renderFollowingSection()}
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

function getCommunityContent() {
    return `
        <div class="container mx-auto px-4 py-8">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">Community Hub</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">Connect, share, and grow with fellow investors</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Find Users</h3>
                    <input type="text" id="user-search" placeholder="Search users..." 
                           class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white">
                    <button onclick="searchUsers()" class="w-full mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                        Search
                    </button>
                    <div id="search-results" class="mt-4"></div>
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

// Portfolio page initialization
function initializePortfolioPage() {
    console.log('Portfolio page initialized');
    
    // Update timestamp
    const timestamp = new Date().toLocaleString();
    const lastUpdatedEl = document.getElementById('portfolio-last-updated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = timestamp;
    }
}

// Portfolio functionality
function togglePortfolioExpansion(event) {
    if (event) event.stopPropagation();
    
    const card = document.querySelector('.dashboard-card.expandable-portfolio');
    const content = document.getElementById('portfolio-chart-content');
    
    if (!card || !content) {
        console.warn('Portfolio card or content not found');
        return;
    }
    
    const isExpanded = card.classList.contains('expanded');
    
    // Close other expanded cards first
    document.querySelectorAll('.dashboard-card.expanded').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('expanded');
            const otherContent = otherCard.querySelector('.portfolio-chart-content, .asset-allocation-chart-content');
            if (otherContent) {
                otherContent.classList.remove('expanded');
                otherContent.classList.add('hidden');
            }
        }
    });
    
    if (isExpanded) {
        // Collapse the card
        card.classList.remove('expanded');
        content.classList.remove('expanded');
        content.classList.add('hidden');
    } else {
        // Expand the card
        card.classList.add('expanded');
        content.classList.remove('hidden');
        
        // Animate the expansion
        setTimeout(() => {
            content.classList.add('expanded');
            initializePortfolioChart();
        }, 10);
    }
}

function initializePortfolioChart() {
    const canvas = document.getElementById('portfolio-chart');
    if (!canvas) return;
    
    // Set canvas to full container size
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 48; // Account for padding
    canvas.height = 500;
    
    const ctx = canvas.getContext('2d');
    drawPortfolioLineChart(ctx, canvas.width, canvas.height);
    
    // Add mouse event listeners for tooltips
    addChartTooltips(canvas, ctx);
}

function drawPortfolioLineChart(ctx, width, height) {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Enhanced portfolio data with more points for smoother line
    const data = [
        { month: 'Jan', date: '2024-01-01', value: 120000 },
        { month: 'Jan', date: '2024-01-15', value: 121200 },
        { month: 'Feb', date: '2024-02-01', value: 122000 },
        { month: 'Feb', date: '2024-02-15', value: 120800 },
        { month: 'Mar', date: '2024-03-01', value: 118000 },
        { month: 'Mar', date: '2024-03-15', value: 119500 },
        { month: 'Apr', date: '2024-04-01', value: 125000 },
        { month: 'Apr', date: '2024-04-15', value: 126200 },
        { month: 'May', date: '2024-05-01', value: 127843 },
        { month: 'May', date: '2024-05-15', value: 127843 }
    ];
    
    // Store data globally for tooltip access
    window.portfolioChartData = data;
    
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
        const y = margin.top + (i * chartHeight / 5);
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = maxValue - (i * range / 5);
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('$' + Math.round(value).toLocaleString(), margin.left - 10, y + 5);
    }
    
    // Vertical grid lines
    for (let i = 0; i < data.length; i += 2) {
        const x = margin.left + (i * (chartWidth / (data.length - 1)));
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, height - margin.bottom);
        ctx.stroke();
    }
    
    // Draw gradient fill under the line
    const gradient = ctx.createLinearGradient(0, margin.top, 0, height - margin.bottom);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    data.forEach((point, index) => {
        const x = margin.left + (index * (chartWidth / (data.length - 1)));
        const y = margin.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.closePath();
    ctx.fill();
    
    // Draw main line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    
    data.forEach((point, index) => {
        const x = margin.left + (index * (chartWidth / (data.length - 1)));
        const y = margin.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = '#10b981';
    data.forEach((point, index) => {
        const x = margin.left + (index * (chartWidth / (data.length - 1)));
        const y = margin.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // White center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#10b981';
    });
    
    // Draw month labels
    ctx.fillStyle = '#374151';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    
    const uniqueMonths = [...new Set(data.map(d => d.month))];
    uniqueMonths.forEach((month, index) => {
        const dataIndex = data.findIndex(d => d.month === month);
        const x = margin.left + (dataIndex * (chartWidth / (data.length - 1)));
        ctx.fillText(month, x, height - margin.bottom + 25);
    });
    
    // Chart title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Portfolio Performance Over Time', width / 2, 25);
}

function updatePortfolioChart() {
    const canvas = document.getElementById('portfolio-chart');
    if (canvas) {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth - 48;
        canvas.height = 500;
        
        const ctx = canvas.getContext('2d');
        drawPortfolioLineChart(ctx, canvas.width, canvas.height);
        addChartTooltips(canvas, ctx);
    }
}

function addChartTooltips(canvas, ctx) {
    const tooltip = createTooltipElement();
    
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const data = window.portfolioChartData;
        if (!data) return;
        
        const margin = { top: 40, right: 40, bottom: 60, left: 80 };
        const chartWidth = canvas.width - margin.left - margin.right;
        const chartHeight = canvas.height - margin.top - margin.bottom;
        
        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const range = maxValue - minValue || 1;
        
        // Find closest data point
        let closestIndex = -1;
        let minDistance = Infinity;
        
        data.forEach((point, index) => {
            const x = margin.left + (index * (chartWidth / (data.length - 1)));
            const y = margin.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
            
            const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
            if (distance < minDistance && distance < 30) {
                minDistance = distance;
                closestIndex = index;
            }
        });
        
        if (closestIndex !== -1) {
            const point = data[closestIndex];
            const x = margin.left + (closestIndex * (chartWidth / (data.length - 1)));
            const y = margin.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
            
            // Show tooltip
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY - 10) + 'px';
            tooltip.innerHTML = `
                <div class="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700">
                    <div class="font-semibold">$${point.value.toLocaleString()}</div>
                    <div class="text-sm text-gray-300">${formatDate(point.date)}</div>
                </div>
            `;
            
            // Highlight the point
            redrawChartWithHighlight(canvas, ctx, closestIndex);
        } else {
            tooltip.style.display = 'none';
            drawPortfolioLineChart(ctx, canvas.width, canvas.height);
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
        drawPortfolioLineChart(ctx, canvas.width, canvas.height);
    });
}

function createTooltipElement() {
    let tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chart-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.display = 'none';
        tooltip.style.zIndex = '1000';
        tooltip.style.pointerEvents = 'none';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

function redrawChartWithHighlight(canvas, ctx, highlightIndex) {
    drawPortfolioLineChart(ctx, canvas.width, canvas.height);
    
    const data = window.portfolioChartData;
    if (!data || highlightIndex < 0) return;
    
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const chartWidth = canvas.width - margin.left - margin.right;
    const chartHeight = canvas.height - margin.top - margin.bottom;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    const point = data[highlightIndex];
    const x = margin.left + (highlightIndex * (chartWidth / (data.length - 1)));
    const y = margin.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
    
    // Draw highlighted point
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function toggleAssetAllocationExpansion(event) {
    if (event) event.stopPropagation();
    
    const card = document.querySelector('.dashboard-card.expandable-asset-allocation');
    const content = document.getElementById('asset-allocation-chart-content');
    
    if (!card || !content) {
        console.warn('Asset allocation card or content not found');
        return;
    }
    
    const isExpanded = card.classList.contains('expanded');
    
    // Close other expanded cards first
    document.querySelectorAll('.dashboard-card.expanded').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('expanded');
            const otherContent = otherCard.querySelector('.portfolio-chart-content, .asset-allocation-chart-content');
            if (otherContent) {
                otherContent.classList.remove('expanded');
                otherContent.classList.add('hidden');
            }
        }
    });
    
    if (isExpanded) {
        // Collapse the card
        card.classList.remove('expanded');
        content.classList.remove('expanded');
        content.classList.add('hidden');
    } else {
        // Expand the card
        card.classList.add('expanded');
        content.classList.remove('hidden');
        
        // Animate the expansion
        setTimeout(() => {
            content.classList.add('expanded');
            initializeAssetAllocationChart();
        }, 10);
    }
}

function initializeAssetAllocationChart() {
    const canvas = document.getElementById('asset-allocation-chart');
    if (!canvas) return;
    
    // Set canvas to full container size
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 80; // Account for padding
    canvas.height = 600;
    
    const ctx = canvas.getContext('2d');
    drawEnhancedPieChart(ctx, canvas.width, canvas.height);
    
    // Add mouse event listeners for tooltips
    addPieChartTooltips(canvas, ctx);
}

function drawSimplePieChart(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    const data = [
        { label: 'Stocks', value: 65, color: '#10b981' },
        { label: 'Bonds', value: 20, color: '#3b82f6' },
        { label: 'Cash', value: 15, color: '#f59e0b' }
    ];
    
    let currentAngle = 0;
    
    data.forEach((item) => {
        const sliceAngle = (item.value / 100) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, labelX, labelY);
        ctx.fillText(item.value + '%', labelX, labelY + 16);
        
        currentAngle += sliceAngle;
    });
}

function refreshPortfolioData() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="bi bi-arrow-clockwise animate-spin mr-2"></i>Refreshing...';
    button.disabled = true;
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
        showNotification('Portfolio data refreshed successfully!', 'success');
        
        const timestamp = new Date().toLocaleString();
        const lastUpdatedEl = document.getElementById('portfolio-last-updated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = timestamp;
        }
    }, 1000);
}

function getFinancialAnalyticsContent() {
    return `
        <div class="container mx-auto px-4 py-8">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">Financial Analytics</h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">Comprehensive analysis of your financial health and spending patterns</p>
            </div>

            <!-- Financial Health Score -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">Financial Health Score</h3>
                    <button onclick="refreshFinancialHealth()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                        <i class="bi bi-arrow-clockwise mr-2"></i>Refresh
                    </button>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Health Score Display -->
                    <div class="text-center">
                        <div class="relative w-32 h-32 mx-auto mb-4">
                            <div class="w-32 h-32 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>
                            <div class="absolute inset-2 rounded-full border-8 border-emerald-500 border-r-transparent border-t-transparent" style="transform: rotate(135deg);"></div>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="text-center">
                                    <div id="health-score-value" class="text-3xl font-bold text-gray-900 dark:text-white">8.7</div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">/ 10</div>
                                </div>
                            </div>
                        </div>
                        <div id="health-level" class="text-xl font-semibold text-emerald-600 dark:text-emerald-400">Excellent</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">Financial Health Level</div>
                    </div>
                    
                    <!-- Health Components -->
                    <div class="lg:col-span-2 space-y-4">
                        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <div class="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                                    <i class="bi bi-piggy-bank text-emerald-600 dark:text-emerald-400"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900 dark:text-white">Savings Rate</div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">Monthly savings percentage</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div id="savings-rate" class="text-xl font-bold text-emerald-600 dark:text-emerald-400">23.5%</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">Score: <span id="savings-score">94/100</span></div>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                    <i class="bi bi-shield-check text-blue-600 dark:text-blue-400"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900 dark:text-white">Emergency Fund</div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">Months of expenses covered</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div id="emergency-fund" class="text-xl font-bold text-blue-600 dark:text-blue-400">5.2 months</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">Score: <span id="emergency-score">87/100</span></div>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                                    <i class="bi bi-wallet2 text-purple-600 dark:text-purple-400"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900 dark:text-white">Total Balance</div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">Across all accounts</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div id="total-balance" class="text-xl font-bold text-purple-600 dark:text-purple-400">$58,830</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">Score: <span id="balance-score">85/100</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bank Connections -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Connected Bank Accounts</h3>
                    <button onclick="connectBankAccount()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                        <i class="bi bi-plus mr-2"></i>Connect Account
                    </button>
                </div>
                
                <div id="bank-connections" class="space-y-4">
                    <!-- Sample bank connection -->
                    <div class="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                <i class="bi bi-bank text-white text-xl"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-gray-900 dark:text-gray-100">Chase Bank</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">3 accounts connected • Last sync: 2 hours ago</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <span class="text-sm text-emerald-600 dark:text-emerald-400">Connected</span>
                            <button onclick="importTransactions(1)" class="ml-4 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors">
                                Import Transactions
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Investment Recommendations -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Investment Recommendations</h3>
                    <div class="flex items-center space-x-2">
                        <select id="risk-tolerance" onchange="updateInvestmentRecommendations()" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-200">
                            <option value="conservative">Conservative</option>
                            <option value="moderate" selected>Moderate</option>
                            <option value="aggressive">Aggressive</option>
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="investment-recommendations">
                    <!-- Investment recommendations will be loaded here -->
                </div>
            </div>
        </div>

        <!-- Bank Connection Modal -->
        <div id="bank-connection-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
                    <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Connect Bank Account</h2>
                            <button onclick="closeBankConnectionModal()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <i class="bi bi-x-lg text-xl"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <form onsubmit="submitBankConnection(event)">
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bank Name</label>
                                    <select id="bank-name" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-200" required>
                                        <option value="">Select your bank</option>
                                        <option value="Chase Bank">Chase Bank</option>
                                        <option value="Bank of America">Bank of America</option>
                                        <option value="Wells Fargo">Wells Fargo</option>
                                        <option value="Citibank">Citibank</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connection Token</label>
                                    <input type="text" id="bank-token" placeholder="Enter your bank connection token" 
                                           class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white" required>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">For demo purposes, enter any value</p>
                                </div>
                                
                                <div class="flex space-x-3 pt-4">
                                    <button type="button" onclick="closeBankConnectionModal()" class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" class="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                                        Connect
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Financial Analytics Functions
async function loadFinancialHealthData() {
    try {
        const mockHealthData = {
            overall_score: 87,
            health_level: "Excellent",
            components: {
                savings_rate: { score: 94, value: 23.5 },
                emergency_fund: { score: 87, value: 5.2 },
                total_balance: { score: 85, value: 58830 }
            }
        };
        
        updateFinancialHealthDisplay(mockHealthData);
        loadInvestmentRecommendations();
    } catch (error) {
        console.error('Error loading financial health data:', error);
    }
}

function updateFinancialHealthDisplay(data) {
    const scoreEl = document.getElementById('health-score-value');
    const levelEl = document.getElementById('health-level');
    const savingsRateEl = document.getElementById('savings-rate');
    const savingsScoreEl = document.getElementById('savings-score');
    const emergencyFundEl = document.getElementById('emergency-fund');
    const emergencyScoreEl = document.getElementById('emergency-score');
    const totalBalanceEl = document.getElementById('total-balance');
    const balanceScoreEl = document.getElementById('balance-score');
    
    if (scoreEl) scoreEl.textContent = (data.overall_score / 10).toFixed(1);
    if (levelEl) levelEl.textContent = data.health_level;
    if (savingsRateEl) savingsRateEl.textContent = data.components.savings_rate.value + '%';
    if (savingsScoreEl) savingsScoreEl.textContent = data.components.savings_rate.score + '/100';
    if (emergencyFundEl) emergencyFundEl.textContent = data.components.emergency_fund.value + ' months';
    if (emergencyScoreEl) emergencyScoreEl.textContent = data.components.emergency_fund.score + '/100';
    if (totalBalanceEl) totalBalanceEl.textContent = '$' + data.components.total_balance.value.toLocaleString();
    if (balanceScoreEl) balanceScoreEl.textContent = data.components.total_balance.score + '/100';
}

async function loadInvestmentRecommendations() {
    const riskTolerance = document.getElementById('risk-tolerance')?.value || 'moderate';
    
    const recommendations = {
        conservative: [
            { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 30, risk: 'Low', return: '6-8%' },
            { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 50, risk: 'Very Low', return: '3-5%' },
            { symbol: 'VMOT', name: 'Vanguard Ultra-Short-Term Bond ETF', allocation: 20, risk: 'Very Low', return: '2-4%' }
        ],
        moderate: [
            { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 40, risk: 'Medium', return: '7-10%' },
            { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 30, risk: 'Low', return: '3-6%' },
            { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 20, risk: 'Medium', return: '6-9%' },
            { symbol: 'VNQ', name: 'Vanguard Real Estate Investment Trust ETF', allocation: 10, risk: 'Medium', return: '5-8%' }
        ],
        aggressive: [
            { symbol: 'QQQ', name: 'Invesco QQQ Trust ETF', allocation: 40, risk: 'High', return: '10-15%' },
            { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 35, risk: 'Medium', return: '8-12%' },
            { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 25, risk: 'Medium-High', return: '7-11%' }
        ]
    };
    
    const currentRecommendations = recommendations[riskTolerance];
    const container = document.getElementById('investment-recommendations');
    
    if (container) {
        container.innerHTML = currentRecommendations.map(rec => `
            <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-500 transition-colors">
                <div class="flex items-center justify-between mb-3">
                    <div class="font-semibold text-gray-900 dark:text-white">${rec.symbol}</div>
                    <div class="text-right">
                        <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">${rec.allocation}%</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">Allocation</div>
                    </div>
                </div>
                <div class="mb-2">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">${rec.name}</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">Expected Return: ${rec.return}</div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">ETF</span>
                    <span class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs rounded">${rec.risk} Risk</span>
                </div>
            </div>
        `).join('');
    }
}

function connectBankAccount() {
    const modal = document.getElementById('bank-connection-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeBankConnectionModal() {
    const modal = document.getElementById('bank-connection-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function submitBankConnection(event) {
    event.preventDefault();
    
    const bankName = document.getElementById('bank-name').value;
    const bankToken = document.getElementById('bank-token').value;
    
    if (!bankName || !bankToken) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showNotification(`Successfully connected to ${bankName}!`, 'success');
        closeBankConnectionModal();
        
        setTimeout(() => {
            showFinancialAnalytics();
        }, 1000);
    } catch (error) {
        showNotification('Failed to connect bank account', 'error');
    }
}

async function importTransactions(connectionId) {
    const button = event.target;
    const originalText = button.textContent;
    
    button.textContent = 'Importing...';
    button.disabled = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        showNotification('Transactions imported successfully!', 'success');
    } catch (error) {
        showNotification('Failed to import transactions', 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

async function refreshFinancialHealth() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="bi bi-arrow-clockwise animate-spin mr-2"></i>Refreshing...';
    button.disabled = true;
    
    try {
        await loadFinancialHealthData();
        showNotification('Financial health data refreshed!', 'success');
    } finally {
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 1000);
    }
}

function updateInvestmentRecommendations() {
    loadInvestmentRecommendations();
}

function refreshRecommendations() {
    loadInvestmentRecommendations();
    showNotification('Investment recommendations updated!', 'success');
}

function drawEnhancedPieChart(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.6;
    
    const data = [
        { label: 'Stocks', value: 65, color: '#10b981', amount: '$83,099' },
        { label: 'Bonds', value: 20, color: '#3b82f6', amount: '$25,569' },
        { label: 'Cash', value: 15, color: '#f59e0b', amount: '$19,175' }
    ];
    
    // Store data globally for tooltip access
    window.pieChartData = data;
    
    let currentAngle = -Math.PI / 2; // Start from top
    
    // Draw chart title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Asset Allocation Breakdown', centerX, 40);
    
    data.forEach((item, index) => {
        const sliceAngle = (item.value / 100) * 2 * Math.PI;
        
        // Draw slice with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        
        // Add border
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Add labels outside the pie
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelRadius = radius + 60;
        const labelX = centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius;
        
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, labelX, labelY);
        ctx.fillText(item.value + '%', labelX, labelY + 20);
        ctx.fillText(item.amount, labelX, labelY + 40);
        
        currentAngle += sliceAngle;
    });
    
    // Draw center circle for donut effect
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Center text
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$127,843', centerX, centerY - 10);
    ctx.font = '14px Arial';
    ctx.fillText('Total Value', centerX, centerY + 15);
}

function addPieChartTooltips(canvas, ctx) {
    const tooltip = createTooltipElement();
    
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const data = window.pieChartData;
        if (!data) return;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.6;
        
        // Calculate angle and distance from center
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) + Math.PI / 2; // Adjust for starting position
        const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
        
        if (distance <= radius && distance >= radius * 0.4) {
            // Find which slice we're hovering over
            let currentAngle = 0;
            let hoveredSlice = -1;
            
            for (let i = 0; i < data.length; i++) {
                const sliceAngle = (data[i].value / 100) * 2 * Math.PI;
                if (normalizedAngle >= currentAngle && normalizedAngle <= currentAngle + sliceAngle) {
                    hoveredSlice = i;
                    break;
                }
                currentAngle += sliceAngle;
            }
            
            if (hoveredSlice !== -1) {
                const slice = data[hoveredSlice];
                
                // Show tooltip
                tooltip.style.display = 'block';
                tooltip.style.left = (event.clientX + 15) + 'px';
                tooltip.style.top = (event.clientY - 15) + 'px';
                tooltip.innerHTML = `
                    <div class="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700">
                        <div class="font-semibold text-lg">${slice.label}</div>
                        <div class="text-emerald-300">${slice.value}% • ${slice.amount}</div>
                        <div class="text-sm text-gray-300 mt-1">Click to view details</div>
                    </div>
                `;
                
                // Highlight the slice
                redrawPieChartWithHighlight(canvas, ctx, hoveredSlice);
            } else {
                tooltip.style.display = 'none';
                drawEnhancedPieChart(ctx, canvas.width, canvas.height);
            }
        } else {
            tooltip.style.display = 'none';
            drawEnhancedPieChart(ctx, canvas.width, canvas.height);
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
        drawEnhancedPieChart(ctx, canvas.width, canvas.height);
    });
}

function redrawPieChartWithHighlight(canvas, ctx, highlightIndex) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.6;
    
    const data = window.pieChartData;
    if (!data) return;
    
    let currentAngle = -Math.PI / 2;
    
    // Clear and redraw chart title
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Asset Allocation Breakdown', centerX, 40);
    
    // Redraw all slices with highlight effect
    data.forEach((item, index) => {
        const sliceAngle = (item.value / 100) * 2 * Math.PI;
        const isHighlighted = index === highlightIndex;
        const sliceRadius = isHighlighted ? radius + 15 : radius;
        const opacity = isHighlighted ? 1 : 0.7;
        
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, sliceRadius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        currentAngle += sliceAngle;
    });
    
    ctx.globalAlpha = 1;
    
    // Redraw center circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Center text
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$127,843', centerX, centerY - 10);
    ctx.font = '14px Arial';
    ctx.fillText('Total Value', centerX, centerY + 15);
}
