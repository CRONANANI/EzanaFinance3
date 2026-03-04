// Recent Transactions Component JavaScript

// Function to load recent transactions data
function loadRecentTransactions() {
    // This would typically fetch data from an API
    console.log('Loading recent transactions...');
    
    // Example of how to dynamically add transactions
    const transactions = [
        {
            type: 'buy',
            icon: 'bi-arrow-up',
            title: 'AAPL Purchase',
            description: 'Apple Inc. • 10 shares',
            amount: '$1,750.00',
            time: '2 hours ago'
        },
        {
            type: 'sell',
            icon: 'bi-arrow-down',
            title: 'MSFT Sale',
            description: 'Microsoft Corp. • 5 shares',
            amount: '$1,920.00',
            time: '1 day ago'
        },
        {
            type: 'dividend',
            icon: 'bi-cash',
            title: 'Dividend Payment',
            description: 'Johnson & Johnson',
            amount: '+$45.20',
            time: '3 days ago',
            positive: true
        }
    ];
    
    return transactions;
}

// Function to render a single transaction item
function renderTransactionItem(transaction) {
    const iconClass = transaction.type === 'buy' ? 'buy' : 
                     transaction.type === 'sell' ? 'sell' : 'dividend';
    
    const amountClass = transaction.positive ? 'positive' : '';
    
    return `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${iconClass}">
                    <i class="bi ${transaction.icon}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${transaction.title}</h4>
                    <p>${transaction.description}</p>
                </div>
            </div>
            <div class="transaction-value">
                <div class="transaction-amount ${amountClass}">${transaction.amount}</div>
                <div class="transaction-time">${transaction.time}</div>
            </div>
        </div>
    `;
}

// Function to refresh transactions
function refreshTransactions() {
    const transactionsContainer = document.querySelector('.transactions-table');
    if (!transactionsContainer) return;
    
    const transactions = loadRecentTransactions();
    transactionsContainer.innerHTML = transactions.map(renderTransactionItem).join('');
}

// Function to handle "View All" button click
function viewAllTransactions() {
    console.log('Viewing all transactions...');
    // This would typically navigate to a full transactions page
    // or open a modal with all transactions
}

// Initialize recent transactions when component loads
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to "View All" button
    const viewAllButton = document.querySelector('.view-all-button');
    if (viewAllButton) {
        viewAllButton.addEventListener('click', viewAllTransactions);
    }
    
    // Load initial transactions
    refreshTransactions();
});

// Export functions for use in other components
window.recentTransactions = {
    loadRecentTransactions,
    renderTransactionItem,
    refreshTransactions,
    viewAllTransactions
};
