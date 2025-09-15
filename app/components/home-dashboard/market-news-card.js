// Market News Card Component JavaScript

class MarketNewsCard {
    constructor() {
        this.currentFilter = 'all';
        this.marketNews = [];
        this.init();
    }

    init() {
        console.log('Initializing market news card...');
        this.loadSampleNews();
        this.renderNews();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add any additional event listeners if needed
    }

    // Sample market news data
    loadSampleNews() {
        const sampleNews = [
            {
                id: 1,
                title: "Federal Reserve Signals Potential Rate Cuts Amid Economic Uncertainty",
                content: "The Federal Reserve hinted at possible interest rate cuts in the coming months as inflation shows signs of cooling and economic growth slows.",
                source: "Reuters",
                category: "economy",
                time: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
                url: "#"
            },
            {
                id: 2,
                title: "Tech Stocks Rally as NVIDIA Reports Strong Q4 Earnings",
                content: "NVIDIA's impressive quarterly results drove tech stocks higher, with the semiconductor sector leading gains in after-hours trading.",
                source: "Bloomberg",
                category: "stocks",
                time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                url: "#"
            },
            {
                id: 3,
                title: "S&P 500 Hits New Record High on Strong Corporate Earnings",
                content: "The S&P 500 reached a new all-time high as better-than-expected earnings reports from major corporations boosted investor confidence.",
                source: "CNBC",
                category: "market",
                time: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                url: "#"
            },
            {
                id: 4,
                title: "Energy Sector Surges on Rising Oil Prices",
                content: "Energy stocks jumped as crude oil prices climbed above $80 per barrel amid supply concerns and increased demand.",
                source: "MarketWatch",
                category: "stocks",
                time: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
                url: "#"
            },
            {
                id: 5,
                title: "Inflation Data Shows Continued Cooling Trend",
                content: "Latest inflation figures indicate a continued cooling trend, potentially paving the way for more accommodative monetary policy.",
                source: "Wall Street Journal",
                category: "economy",
                time: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
                url: "#"
            },
            {
                id: 6,
                title: "Cryptocurrency Market Shows Signs of Recovery",
                content: "Bitcoin and other major cryptocurrencies posted gains as institutional adoption continues to grow and regulatory clarity improves.",
                source: "CoinDesk",
                category: "market",
                time: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
                url: "#"
            }
        ];

        this.marketNews = [...sampleNews];
    }

    // Render news list
    renderNews() {
        const newsList = document.getElementById('news-list');
        const emptyState = document.getElementById('news-empty');
        
        if (!newsList) return;

        let filteredNews = this.marketNews;
        if (this.currentFilter !== 'all') {
            filteredNews = this.marketNews.filter(news => news.category === this.currentFilter);
        }

        if (filteredNews.length === 0) {
            newsList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        newsList.innerHTML = filteredNews.map(news => {
            const timeAgo = this.getTimeAgo(news.time);
            return `
                <div class="news-item" onclick="marketNewsCard.openNewsUrl('${news.url}')">
                    <div class="news-item-header">
                        <h4 class="news-item-title">${news.title}</h4>
                        <span class="news-item-time">${timeAgo}</span>
                    </div>
                    <div class="news-item-content">${news.content}</div>
                    <div class="news-item-footer">
                        <div class="news-item-source">
                            <i class="bi bi-link-45deg"></i>
                            ${news.source}
                        </div>
                        <div class="news-item-category">${news.category}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Filter news
    filterNews(filter) {
        this.currentFilter = filter;
        
        // Update filter buttons
        document.querySelectorAll('.news-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        this.renderNews();
    }

    // Refresh market news
    refreshNews() {
        // Simulate refresh by shuffling news order
        this.marketNews = this.marketNews.sort(() => Math.random() - 0.5);
        this.renderNews();
        
        // Add refresh animation
        const refreshBtn = document.querySelector('.refresh-news-btn');
        if (refreshBtn) {
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        }
    }

    // Open news settings
    openNewsSettings() {
        console.log('Opening news settings...');
        // Implement news settings modal
    }

    // Open news URL
    openNewsUrl(url) {
        if (url && url !== '#') {
            window.open(url, '_blank');
        }
    }

    // Get time ago string
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    // Add new news item
    addNewsItem(newsItem) {
        const newItem = {
            id: Date.now() + Math.random(),
            time: new Date(),
            ...newsItem
        };
        this.marketNews.unshift(newItem);
        this.renderNews();
    }

    // Remove news item
    removeNewsItem(id) {
        this.marketNews = this.marketNews.filter(news => news.id !== id);
        this.renderNews();
    }
}

// Global functions for HTML onclick handlers
function refreshMarketNews() {
    if (window.marketNewsCard) {
        window.marketNewsCard.refreshNews();
    }
}

function openNewsSettings() {
    if (window.marketNewsCard) {
        window.marketNewsCard.openNewsSettings();
    }
}

function filterNews(filter) {
    if (window.marketNewsCard) {
        window.marketNewsCard.filterNews(filter);
    }
}

// Initialize market news card when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing market news card...');
    window.marketNewsCard = new MarketNewsCard();
});
