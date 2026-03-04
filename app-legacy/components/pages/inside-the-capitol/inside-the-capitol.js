// Inside the Capitol - JavaScript Functionality

// Global state for congressional trading data
let congressTradingData = {
    trades: [],
    currentPage: 1,
    itemsPerPage: 10,
    currentFilter: 'all',
    totalTrades: 0,
    isLoading: false
};

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeInsideTheCapitol();
});

// Initialize all functionality
function initializeInsideTheCapitol() {
    loadCongressTradingData();
    loadGovernmentContractsData();
    loadHouseTradingData();
    loadSenatorTradingData();
    loadLobbyingActivityData();
    loadPatentMomentumData();
    setupEventListeners();
    updateSummaryStats();
    startDataRefreshInterval();
}

// Setup event listeners
function setupEventListeners() {
    // Refresh buttons
    const refreshButtons = document.querySelectorAll('[id$="refreshCongressData"]');
    refreshButtons.forEach(btn => {
        btn.addEventListener('click', refreshCongressData);
    });
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('[id^="filter-"]');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.id.replace('filter-', '');
            filterCongressTrades(e, filter);
        });
    });
    
    // Pagination buttons
    const prevBtn = document.getElementById('congressPrevPage');
    const nextBtn = document.getElementById('congressNextPage');
    
    if (prevBtn) prevBtn.addEventListener('click', (e) => changeCongressPage(e, -1));
    if (nextBtn) nextBtn.addEventListener('click', (e) => changeCongressPage(e, 1));
}

// Toggle congressional trading card expansion
function toggleCongressTradingExpansion() {
    const card = document.getElementById('historicalCongressTradingCard');
    const expandedContent = document.getElementById('congressTradingExpandedContent');
    const toggleIcon = document.querySelector('.congress-toggle-icon i');
    
    if (card && expandedContent && toggleIcon) {
        const isExpanded = !expandedContent.classList.contains('hidden');
        
        if (isExpanded) {
            // Collapse
            expandedContent.classList.add('hidden');
            expandedContent.classList.remove('visible');
            card.classList.remove('expanded');
            toggleIcon.classList.remove('rotated');
        } else {
            // Expand
            expandedContent.classList.remove('hidden');
            expandedContent.classList.add('visible');
            card.classList.add('expanded');
            toggleIcon.classList.add('rotated');
            
            // Load data if not already loaded
            if (congressTradingData.trades.length === 0) {
                loadCongressTradingData();
            }
        }
    }
}

// Load congressional trading data from Quiver API
async function loadCongressTradingData() {
    if (congressTradingData.isLoading) return;

    congressTradingData.isLoading = true;
    updateLoadingState(true);

    try {
        let data;
        if (window.apiService && typeof window.apiService.getCongressionalTrading === 'function') {
            data = await window.apiService.getCongressionalTrading(200);
        } else {
            const url = (window.EZANA_API_BASE || '') + '/api/quiver/congressional-trading?limit=200';
            const res = await fetch(url || '/api/quiver/congressional-trading?limit=200', { headers: { Accept: 'application/json' } });
            data = res.ok ? await res.json() : { trades: [], total: 0 };
        }

        congressTradingData.trades = data.trades || [];
        congressTradingData.totalTrades = data.total ?? congressTradingData.trades.length;

        updateCongressApiStatus(congressTradingData.trades.length > 0 || data.total > 0);
        updateCongressTradingDisplay();
        updateSummaryStats();
    } catch (error) {
        console.error('Error loading congressional trading data:', error);
        congressTradingData.trades = generateMockCongressData();
        congressTradingData.totalTrades = congressTradingData.trades.length;
        updateCongressApiStatus(false);
        updateCongressTradingDisplay();
    } finally {
        congressTradingData.isLoading = false;
        updateLoadingState(false);
    }
}

function updateCongressApiStatus(connected) {
    const el = document.getElementById('congressApiStatus');
    if (el) {
        el.classList.toggle('connected', connected);
        el.classList.toggle('disconnected', !connected);
        el.title = connected ? 'API Connected' : 'Using fallback data';
    }
}

async function loadGovernmentContractsData() {
    try {
        const data = window.apiService?.getGovernmentContracts
            ? await window.apiService.getGovernmentContracts(100)
            : await fetch('/api/quiver/government-contracts?limit=100').then(r => r.json()).catch(() => []);
        const list = Array.isArray(data) ? data : [];
        const total = list.length;
        const totalVal = list.reduce((s, c) => s + (c.contractValue || c.ContractValue || 0), 0);
        const companies = new Set(list.map(c => c.ticker || c.Ticker || c.companyName || '')).size;
        setCardStats('contracts', { total, totalVal, companies }, document.getElementById('contractsApiStatus'));
    } catch (e) { setCardStats('contracts', null, document.getElementById('contractsApiStatus')); }
}

async function loadHouseTradingData() {
    try {
        const data = await (window.apiService?.getHouseTrading?.(100) || fetch('/api/quiver/house-trading?limit=100').then(r => r.json()).catch(() => []));
        const list = Array.isArray(data) ? data : [];
        const total = list.length;
        const totalVol = list.reduce((s, t) => s + (t.amount || 0), 0);
        const traders = new Set(list.map(t => t.member)).size;
        setCardStats('house', { total, totalVol, traders }, document.getElementById('houseApiStatus'));
    } catch (e) { setCardStats('house', null, document.getElementById('houseApiStatus')); }
}

async function loadSenatorTradingData() {
    try {
        const data = await (window.apiService?.getSenatorTrading?.(100) || fetch('/api/quiver/senator-trading?limit=100').then(r => r.json()).catch(() => []));
        const list = Array.isArray(data) ? data : [];
        const total = list.length;
        const totalVol = list.reduce((s, t) => s + (t.amount || 0), 0);
        const traders = new Set(list.map(t => t.member)).size;
        setCardStats('senator', { total, totalVol, traders }, document.getElementById('senatorApiStatus'));
    } catch (e) { setCardStats('senator', null, document.getElementById('senatorApiStatus')); }
}

async function loadLobbyingActivityData() {
    try {
        const data = await (window.apiService?.getLobbyingActivity?.(100) || fetch('/api/quiver/lobbying-activity?limit=100').then(r => r.json()).catch(() => []));
        const list = Array.isArray(data) ? data : [];
        const reports = list.length;
        const spending = list.reduce((s, l) => s + (l.amount || l.Amount || 0), 0);
        const firms = new Set(list.map(l => l.firmName || l.FirmName || '')).size;
        setCardStats('lobbying', { reports, spending, firms }, document.getElementById('lobbyingApiStatus'));
    } catch (e) { setCardStats('lobbying', null, document.getElementById('lobbyingApiStatus')); }
}

async function loadPatentMomentumData() {
    try {
        const data = await (window.apiService?.getPatentMomentum?.(100) || fetch('/api/quiver/patent-momentum?limit=100').then(r => r.json()).catch(() => []));
        const list = Array.isArray(data) ? data : [];
        const total = list.length;
        const active = list.filter(p => (p.status || p.Status) === 'Active').length;
        const pending = list.filter(p => (p.status || p.Status) === 'Pending').length;
        setCardStats('patents', { total, active, pending }, document.getElementById('patentsApiStatus'));
    } catch (e) { setCardStats('patents', null, document.getElementById('patentsApiStatus')); }
}

function setCardStats(card, stats, statusEl) {
    const fmt = (n) => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n);
    const now = new Date().toLocaleTimeString();
    if (card === 'contracts' && stats) {
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('contractsTotal', stats.total); el('contractsValue', '$' + fmt(stats.totalVal)); el('contractsCompanies', stats.companies);
        el('contractsLastUpdated', now);
    } else if (card === 'house' && stats) {
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('houseTotalTrades', stats.total); el('houseTotalVolume', '$' + fmt(stats.totalVol)); el('houseActiveTraders', stats.traders);
        el('houseLastUpdated', now);
    } else if (card === 'senator' && stats) {
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('senatorTotalTrades', stats.total); el('senatorTotalVolume', '$' + fmt(stats.totalVol)); el('senatorActiveTraders', stats.traders);
        el('senatorLastUpdated', now);
    } else if (card === 'lobbying' && stats) {
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('lobbyingReports', stats.reports); el('lobbyingSpending', '$' + fmt(stats.spending)); el('lobbyingFirms', stats.firms);
        el('lobbyingLastUpdated', now);
    } else if (card === 'patents' && stats) {
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('patentsTotal', stats.total); el('patentsActive', stats.active); el('patentsPending', stats.pending);
        el('patentsLastUpdated', now);
    }
    if (statusEl) {
        statusEl.classList.toggle('connected', !!stats);
        statusEl.classList.toggle('disconnected', !stats);
        statusEl.title = stats ? 'Live data from Quiver' : 'Fallback data';
    }
}

// Generate mock congressional trading data
function generateMockCongressData() {
    const mockTrades = [];
    const congressMembers = [
        { name: 'Nancy Pelosi', party: 'D', chamber: 'House' },
        { name: 'Mitch McConnell', party: 'R', chamber: 'Senate' },
        { name: 'Chuck Schumer', party: 'D', chamber: 'Senate' },
        { name: 'Kevin McCarthy', party: 'R', chamber: 'House' },
        { name: 'Alexandria Ocasio-Cortez', party: 'D', chamber: 'House' },
        { name: 'Ted Cruz', party: 'R', chamber: 'Senate' },
        { name: 'Elizabeth Warren', party: 'D', chamber: 'Senate' },
        { name: 'Marco Rubio', party: 'R', chamber: 'Senate' }
    ];
    
    const companies = [
        { name: 'Apple Inc.', ticker: 'AAPL' },
        { name: 'Microsoft Corporation', ticker: 'MSFT' },
        { name: 'Tesla Inc.', ticker: 'TSLA' },
        { name: 'Amazon.com Inc.', ticker: 'AMZN' },
        { name: 'Alphabet Inc.', ticker: 'GOOGL' },
        { name: 'Meta Platforms Inc.', ticker: 'META' },
        { name: 'NVIDIA Corporation', ticker: 'NVDA' },
        { name: 'Netflix Inc.', ticker: 'NFLX' }
    ];
    
    const tradeTypes = ['buy', 'sell'];
    
    for (let i = 0; i < 50; i++) {
        const member = congressMembers[Math.floor(Math.random() * congressMembers.length)];
        const company = companies[Math.floor(Math.random() * companies.length)];
        const tradeType = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
        const amount = Math.floor(Math.random() * 1000000) + 10000;
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        mockTrades.push({
            id: i + 1,
            date: date.toISOString().split('T')[0],
            member: member.name,
            party: member.party,
            chamber: member.chamber,
            company: company.name,
            ticker: company.ticker,
            tradeType: tradeType,
            amount: amount,
            isFollowing: Math.random() > 0.7
        });
    }
    
    return mockTrades.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Update congressional trading display
function updateCongressTradingDisplay() {
    updateCongressTradingTable();
    updateCongressTradingStats();
    updatePagination();
}

// Update congressional trading table
function updateCongressTradingTable() {
    const tableBody = document.getElementById('congressTradingTableBody');
    if (!tableBody) return;
    
    const filteredTrades = getFilteredTrades();
    const startIndex = (congressTradingData.currentPage - 1) * congressTradingData.itemsPerPage;
    const endIndex = startIndex + congressTradingData.itemsPerPage;
    const pageTrades = filteredTrades.slice(startIndex, endIndex);
    
    tableBody.innerHTML = '';
    
    pageTrades.forEach(trade => {
        const row = createCongressTradingRow(trade);
        tableBody.appendChild(row);
    });
}

// Create a congressional trading table row
function createCongressTradingRow(trade) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-muted/50 transition-colors duration-200';
    
    const followButtonClass = trade.isFollowing ? 
        'congress-follow-btn following' : 
        'congress-follow-btn not-following';
    
    const tradeTypeClass = trade.tradeType === 'buy' ? 
        'text-green-500' : 'text-red-500';
    
    row.innerHTML = `
        <td class="py-2 px-3">${formatDate(trade.date)}</td>
        <td class="py-2 px-3">
            <button class="${followButtonClass}" onclick="toggleFollow(${trade.id})">
                ${trade.isFollowing ? 'Following' : 'Follow'}
            </button>
        </td>
        <td class="py-2 px-3">${trade.member}</td>
        <td class="py-2 px-3">
            <span class="px-2 py-1 text-xs rounded-full ${trade.party === 'D' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}">
                ${trade.party}
            </span>
        </td>
        <td class="py-2 px-3">${trade.company}</td>
        <td class="py-2 px-3 font-mono">${trade.ticker}</td>
        <td class="py-2 px-3">
            <span class="${tradeTypeClass} font-semibold">
                ${trade.tradeType.toUpperCase()}
            </span>
        </td>
        <td class="py-2 px-3 text-right font-mono">$${formatNumber(trade.amount)}</td>
    `;
    
    return row;
}

// Get filtered trades based on current filter
function getFilteredTrades() {
    if (congressTradingData.currentFilter === 'all') {
        return congressTradingData.trades;
    }
    return congressTradingData.trades.filter(trade => 
        trade.tradeType === congressTradingData.currentFilter
    );
}

// Filter congressional trades
function filterCongressTrades(event, filter) {
    event.preventDefault();
    event.stopPropagation();
    
    // Update filter buttons
    const filterButtons = document.querySelectorAll('[id^="filter-"]');
    filterButtons.forEach(btn => {
        btn.classList.remove('active', 'congress-filter-btn');
        btn.classList.add('inactive', 'congress-filter-btn');
    });
    
    const activeButton = document.getElementById(`filter-${filter}`);
    if (activeButton) {
        activeButton.classList.remove('inactive');
        activeButton.classList.add('active');
    }
    
    // Update current filter and reset to first page
    congressTradingData.currentFilter = filter;
    congressTradingData.currentPage = 1;
    
    // Update display
    updateCongressTradingDisplay();
}

// Change congressional trading page
function changeCongressPage(event, direction) {
    event.preventDefault();
    event.stopPropagation();
    
    const newPage = congressTradingData.currentPage + direction;
    const filteredTrades = getFilteredTrades();
    const totalPages = Math.ceil(filteredTrades.length / congressTradingData.itemsPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
        congressTradingData.currentPage = newPage;
        updateCongressTradingDisplay();
    }
}

// Update pagination controls
function updatePagination() {
    const filteredTrades = getFilteredTrades();
    const totalPages = Math.ceil(filteredTrades.length / congressTradingData.itemsPerPage);
    const startIndex = (congressTradingData.currentPage - 1) * congressTradingData.itemsPerPage + 1;
    const endIndex = Math.min(congressTradingData.currentPage * congressTradingData.itemsPerPage, filteredTrades.length);
    
    // Update pagination info
    const startSpan = document.getElementById('congressTradesStart');
    const endSpan = document.getElementById('congressTradesEnd');
    const totalSpan = document.getElementById('congressTradesTotal');
    
    if (startSpan) startSpan.textContent = startIndex;
    if (endSpan) endSpan.textContent = endIndex;
    if (totalSpan) totalSpan.textContent = filteredTrades.length;
    
    // Update pagination buttons
    const prevBtn = document.getElementById('congressPrevPage');
    const nextBtn = document.getElementById('congressNextPage');
    
    if (prevBtn) {
        prevBtn.disabled = congressTradingData.currentPage === 1;
    }
    if (nextBtn) {
        nextBtn.disabled = congressTradingData.currentPage === totalPages;
    }
}

// Toggle follow status for a congress member
function toggleFollow(tradeId) {
    const trade = congressTradingData.trades.find(t => t.id === tradeId);
    if (trade) {
        trade.isFollowing = !trade.isFollowing;
        updateCongressTradingTable();
    }
}

// Update congressional trading stats
function updateCongressTradingStats() {
    const totalTrades = document.getElementById('congressTotalTrades');
    const totalVolume = document.getElementById('congressTotalVolume');
    const activeTraders = document.getElementById('congressActiveTraders');
    const lastUpdated = document.getElementById('congressLastUpdated');
    
    if (totalTrades) totalTrades.textContent = congressTradingData.totalTrades;
    if (totalVolume) {
        const totalVol = congressTradingData.trades.reduce((sum, trade) => sum + trade.amount, 0);
        totalVolume.textContent = `$${formatNumber(totalVol)}`;
    }
    if (activeTraders) {
        const uniqueTraders = new Set(congressTradingData.trades.map(trade => trade.member));
        activeTraders.textContent = uniqueTraders.size;
    }
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleTimeString();
    }
}

// Update summary stats
function updateSummaryStats() {
    const totalTradesSummary = document.getElementById('total-trades-summary');
    const totalVolumeSummary = document.getElementById('total-volume-summary');
    const activeTradersSummary = document.getElementById('active-traders-summary');
    const weeklyTradesSummary = document.getElementById('weekly-trades-summary');
    
    if (totalTradesSummary) totalTradesSummary.textContent = congressTradingData.totalTrades;
    if (totalVolumeSummary) {
        const totalVol = congressTradingData.trades.reduce((sum, trade) => sum + trade.amount, 0);
        totalVolumeSummary.textContent = `$${formatNumber(totalVol)}`;
    }
    if (activeTradersSummary) {
        const uniqueTraders = new Set(congressTradingData.trades.map(trade => trade.member));
        activeTradersSummary.textContent = uniqueTraders.size;
    }
    if (weeklyTradesSummary) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyTrades = congressTradingData.trades.filter(trade => 
            new Date(trade.date) >= weekAgo
        ).length;
        weeklyTradesSummary.textContent = `+${weeklyTrades}`;
    }
}

// Refresh congressional data
async function refreshCongressData(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const refreshBtn = document.getElementById('refreshCongressData');
    if (refreshBtn) {
        refreshBtn.classList.add('refresh-spinning');
    }
    
    await loadCongressTradingData();
    
    if (refreshBtn) {
        refreshBtn.classList.remove('refresh-spinning');
    }
}

// Update loading state
function updateLoadingState(isLoading) {
    const refreshBtn = document.getElementById('refreshCongressData');
    if (refreshBtn) {
        if (isLoading) {
            refreshBtn.classList.add('refresh-spinning');
        } else {
            refreshBtn.classList.remove('refresh-spinning');
        }
    }
}

// Start data refresh interval
function startDataRefreshInterval() {
    // Refresh data every 5 minutes
    setInterval(() => {
        if (!congressTradingData.isLoading) {
            refreshCongressData();
        }
    }, 5 * 60 * 1000);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

// Export functions for global access
window.toggleCongressTradingExpansion = toggleCongressTradingExpansion;
window.filterCongressTrades = filterCongressTrades;
window.changeCongressPage = changeCongressPage;
window.toggleFollow = toggleFollow;
window.refreshCongressData = refreshCongressData;
