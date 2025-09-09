// Global variables
let sidebarCollapsed = false;
let followedCongressPeople = new Set(JSON.parse(localStorage.getItem('followedCongressPeople') || '[]'));

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
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function hideAllContent() {
    const contents = ['landing-page', 'portfolio-dashboard', 'dynamic-content'];
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
    
    await pageLoader.renderPage('home-dashboard');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showInsideTheCapitol() {
    hideAllContent();
    
    // Show sidebar for inside the capitol
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    await pageLoader.renderPage('inside-the-capitol');
    
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

async function showCommunity() {
    hideAllContent();
    
    // Show sidebar
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.marginLeft = '280px';
    
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.style.display = 'block';
    
    await pageLoader.renderPage('community');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
