// Portfolio Market News List Component

class PortfolioNewsList {
    constructor() {
        this.newsData = [];
        this.filteredNews = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.loadSampleNews();
        this.renderNews();
        console.log('Portfolio News List initialized');
    }

    loadSampleNews() {
        this.newsData = [
            {
                id: 1,
                title: "Tech Stocks Rally on AI Breakthrough",
                source: "Financial Times",
                description: "Major technology companies see significant gains following breakthrough announcements in artificial intelligence and machine learning capabilities.",
                category: "stocks",
                timeAgo: "2 hours ago",
                url: "https://example.com/news/1",
                image: "🤖"
            },
            {
                id: 2,
                title: "Federal Reserve Signals Rate Cut",
                source: "Wall Street Journal",
                description: "The Federal Reserve hints at potential interest rate cuts in the coming months, sparking optimism in financial markets.",
                category: "economy",
                timeAgo: "4 hours ago",
                url: "https://example.com/news/2",
                image: "🏦"
            },
            {
                id: 3,
                title: "Energy Sector Shows Strong Growth",
                source: "Bloomberg",
                description: "Renewable energy companies report record quarterly earnings, driven by increased demand for sustainable solutions.",
                category: "market",
                timeAgo: "6 hours ago",
                url: "https://example.com/news/3",
                image: "⚡"
            },
            {
                id: 4,
                title: "Healthcare Stocks Under Pressure",
                source: "Reuters",
                description: "Pharmaceutical companies face regulatory challenges as new drug approval processes become more stringent.",
                category: "stocks",
                timeAgo: "8 hours ago",
                url: "https://example.com/news/4",
                image: "💊"
            },
            {
                id: 5,
                title: "Global Markets Reach New Highs",
                source: "CNBC",
                description: "International markets show strong performance with major indices reaching record levels amid positive economic indicators.",
                category: "market",
                timeAgo: "12 hours ago",
                url: "https://example.com/news/5",
                image: "📈"
            },
            {
                id: 6,
                title: "Inflation Data Shows Cooling Trend",
                source: "MarketWatch",
                description: "Latest inflation figures indicate a cooling trend, providing relief to consumers and investors alike.",
                category: "economy",
                timeAgo: "1 day ago",
                url: "https://example.com/news/6",
                image: "📊"
            }
        ];
        this.filteredNews = [...this.newsData];
    }

    renderNews() {
        const newsList = document.getElementById('portfolio-news-list');
        const emptyState = document.getElementById('portfolio-news-empty');
        
        if (!newsList) {
            console.error('Portfolio news list element not found');
            return;
        }

        if (this.filteredNews.length === 0) {
            newsList.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'flex';
            }
            return;
        }

        newsList.style.display = 'block';
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Create header
        const headerHtml = `
            <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">Latest portfolio market news</li>
        `;

        // Create news items
        const newsItemsHtml = this.filteredNews.map(news => `
            <li class="list-row" onclick="openNewsUrl('${news.url}')">
                <div class="news-item-image">${news.image}</div>
                <div class="news-item-content">
                    <div class="news-item-title">${news.title}</div>
                    <div class="news-item-source">${news.source} • ${news.timeAgo}</div>
                </div>
                <p class="list-col-wrap text-xs">
                    ${news.description}
                </p>
                <button class="btn btn-square btn-ghost" onclick="event.stopPropagation(); openNewsUrl('${news.url}')" title="Read full article">
                    <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor">
                            <path d="M6 3L20 12 6 21 6 3z"></path>
                        </g>
                    </svg>
                </button>
                <button class="btn btn-square btn-ghost" onclick="event.stopPropagation(); saveNewsItem(${news.id})" title="Save for later">
                    <svg class="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                        </g>
                    </svg>
                </button>
            </li>
        `).join('');

        newsList.innerHTML = headerHtml + newsItemsHtml;
    }

    filterNews(category) {
        this.currentFilter = category;
        
        // Update filter buttons
        document.querySelectorAll('.news-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === category) {
                btn.classList.add('active');
            }
        });

        // Filter news
        if (category === 'all') {
            this.filteredNews = [...this.newsData];
        } else {
            this.filteredNews = this.newsData.filter(news => news.category === category);
        }

        this.renderNews();
    }

    refreshNews() {
        console.log('Refreshing portfolio news...');
        // Simulate refresh by shuffling the order
        this.newsData = this.newsData.sort(() => Math.random() - 0.5);
        this.filterNews(this.currentFilter);
        
        // Show refresh animation
        const refreshBtn = document.querySelector('.refresh-news-btn');
        if (refreshBtn) {
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        }
    }

    openNewsSettings() {
        console.log('Opening news settings...');
        // Implement news settings functionality
        alert('News settings would open here');
    }
}

// Global functions for onclick handlers
function filterPortfolioNews(category) {
    if (window.portfolioNewsList) {
        window.portfolioNewsList.filterNews(category);
    }
}

function refreshPortfolioNews() {
    if (window.portfolioNewsList) {
        window.portfolioNewsList.refreshNews();
    }
}

function openNewsSettings() {
    if (window.portfolioNewsList) {
        window.portfolioNewsList.openNewsSettings();
    }
}

function openNewsUrl(url) {
    console.log('Opening news URL:', url);
    // In a real application, this would open the URL
    window.open(url, '_blank');
}

function saveNewsItem(newsId) {
    console.log('Saving news item:', newsId);
    // In a real application, this would save the news item
    alert('News item saved for later reading');
}

// Initialize portfolio news list when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing portfolio news list...');
    setTimeout(() => {
        window.portfolioNewsList = new PortfolioNewsList();
        console.log('Portfolio news list initialized');
    }, 500);
});

// Also try to initialize when window loads
window.addEventListener('load', function() {
    if (!window.portfolioNewsList) {
        console.log('Window loaded, initializing portfolio news list...');
        window.portfolioNewsList = new PortfolioNewsList();
        console.log('Portfolio news list initialized on window load');
    }
});
