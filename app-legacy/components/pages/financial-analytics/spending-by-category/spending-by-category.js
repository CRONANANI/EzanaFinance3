// Spending by Category Card Component JavaScript
class SpendingByCategory {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.categories = [];
        this.init();
    }

    init() {
        this.loadSpendingData();
        this.setupEventListeners();
    }

    async loadSpendingData() {
        try {
            // Simulate API call
            const data = [
                { name: 'Groceries', amount: 1245.67, percentage: 32.1, color: 'groceries' },
                { name: 'Dining', amount: 867.43, percentage: 22.4, color: 'dining' },
                { name: 'Transportation', amount: 543.21, percentage: 14.0, color: 'transportation' },
                { name: 'Utilities', amount: 432.89, percentage: 11.2, color: 'utilities' },
                { name: 'Entertainment', amount: 321.45, percentage: 8.3, color: 'entertainment' }
            ];
            
            this.categories = data;
            this.renderSpendingCategories();
            this.updateSummary();
        } catch (error) {
            console.error('Error loading spending data:', error);
        }
    }

    renderSpendingCategories() {
        const categoriesContainer = this.container.querySelector('.spending-categories');
        if (!categoriesContainer) return;

        // Clear existing content
        categoriesContainer.innerHTML = '';

        // Render each category
        this.categories.forEach(category => {
            const categoryItem = this.createCategoryItem(category);
            categoriesContainer.appendChild(categoryItem);
        });
    }

    createCategoryItem(category) {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            <div class="category-info">
                <div class="category-color ${category.color}"></div>
                <span class="category-name">${category.name}</span>
            </div>
            <div class="category-amount">
                <div class="amount-value">$${category.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div class="amount-percentage">${category.percentage}%</div>
            </div>
        `;
        
        // Add click handler for category details
        categoryItem.addEventListener('click', () => {
            this.showCategoryDetails(category);
        });
        
        return categoryItem;
    }

    updateSummary() {
        const totalSpending = this.categories.reduce((sum, category) => sum + category.amount, 0);
        const dailyAverage = totalSpending / 30;

        const summaryContainer = this.container.querySelector('.spending-summary');
        if (!summaryContainer) return;

        summaryContainer.innerHTML = `
            <div class="summary-row">
                <span class="summary-label">Total Spending</span>
                <span class="summary-value">$${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Daily Average</span>
                <span class="summary-value">$${dailyAverage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
        `;
    }

    setupEventListeners() {
        // Add any additional event listeners here
    }

    showCategoryDetails(category) {
        // Create modal or navigate to detailed view
        console.log('Showing details for category:', category.name);
        
        // For now, show a simple alert
        alert(`${category.name} Spending Details:\nAmount: $${category.amount.toLocaleString()}\nPercentage: ${category.percentage}%`);
    }

    updateTimeRange(timeRange) {
        console.log('Updating time range to:', timeRange);
        
        // Simulate different data based on time range
        const multipliers = {
            '7': 0.25,
            '30': 1,
            '90': 3,
            '365': 12
        };
        
        const multiplier = multipliers[timeRange] || 1;
        
        this.categories.forEach(category => {
            category.amount *= multiplier;
            // Recalculate percentages
        });
        
        this.renderSpendingCategories();
        this.updateSummary();
    }

    exportData() {
        const data = {
            categories: this.categories,
            totalSpending: this.categories.reduce((sum, category) => sum + category.amount, 0),
            dailyAverage: this.categories.reduce((sum, category) => sum + category.amount, 0) / 30,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spending-by-category-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize spending by category when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const spendingCard = document.getElementById('spending-by-category');
    if (spendingCard) {
        new SpendingByCategory('spending-by-category');
    }
});
