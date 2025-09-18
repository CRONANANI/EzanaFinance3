// Connected Bank Accounts Card Component JavaScript
class ConnectedBankAccounts {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.banks = [];
        this.init();
    }

    init() {
        this.loadBankAccounts();
        this.setupEventListeners();
    }

    async loadBankAccounts() {
        try {
            // Simulate API call
            const data = [
                {
                    id: 1,
                    name: 'Chase Bank',
                    accounts: 3,
                    lastSync: '2 hours ago',
                    status: 'connected',
                    icon: 'bi-bank'
                }
            ];
            
            this.banks = data;
            this.renderBankAccounts();
        } catch (error) {
            console.error('Error loading bank accounts:', error);
        }
    }

    renderBankAccounts() {
        const bankList = this.container.querySelector('.bank-accounts-list');
        if (!bankList) return;

        // Clear existing content
        bankList.innerHTML = '';

        // Render connected banks
        this.banks.forEach(bank => {
            const bankItem = this.createBankItem(bank);
            bankList.appendChild(bankItem);
        });

        // Add placeholder for more banks
        const placeholder = this.createAddBankPlaceholder();
        bankList.appendChild(placeholder);
    }

    createBankItem(bank) {
        const bankItem = document.createElement('div');
        bankItem.className = 'bank-account-item connected';
        bankItem.innerHTML = `
            <div class="bank-info">
                <div class="bank-icon">
                    <i class="bi ${bank.icon}"></i>
                </div>
                <div class="bank-details">
                    <div class="bank-name">${bank.name}</div>
                    <div class="bank-status">${bank.accounts} accounts connected • Last sync: ${bank.lastSync}</div>
                </div>
            </div>
            <div class="bank-actions">
                <div class="connection-status">
                    <span class="status-indicator"></span>
                    <span class="status-text">Connected</span>
                </div>
                <button onclick="importTransactions(${bank.id})" class="import-btn">
                    Import Transactions
                </button>
            </div>
        `;
        return bankItem;
    }

    createAddBankPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'add-bank-placeholder';
        placeholder.innerHTML = `
            <div class="placeholder-icon">
                <i class="bi bi-bank"></i>
            </div>
            <div class="placeholder-content">
                <p class="placeholder-text">Connect more bank accounts for better insights</p>
                <button onclick="connectBankAccount()" class="add-bank-btn">
                    Add Another Bank
                </button>
            </div>
        `;
        return placeholder;
    }

    setupEventListeners() {
        // Modal event listeners are handled by global functions
    }

    showConnectionModal() {
        const modal = document.getElementById('bank-connection-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hideConnectionModal() {
        const modal = document.getElementById('bank-connection-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    async submitBankConnection(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const bankName = formData.get('bank-name') || document.getElementById('bank-name').value;
        const bankToken = formData.get('bank-token') || document.getElementById('bank-token').value;

        if (!bankName || !bankToken) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Add new bank to list
            const newBank = {
                id: this.banks.length + 1,
                name: bankName,
                accounts: 1,
                lastSync: 'Just now',
                status: 'connected',
                icon: 'bi-bank'
            };
            
            this.banks.push(newBank);
            this.renderBankAccounts();
            
            this.hideConnectionModal();
            this.showNotification('Bank account connected successfully!', 'success');
            
            // Reset form
            form.reset();
        } catch (error) {
            console.error('Error connecting bank:', error);
            this.showNotification('Failed to connect bank account', 'error');
        }
    }

    async importTransactions(bankId) {
        const bank = this.banks.find(b => b.id === bankId);
        if (!bank) return;

        try {
            // Simulate import process
            this.showNotification('Importing transactions...', 'info');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showNotification(`Successfully imported transactions from ${bank.name}`, 'success');
        } catch (error) {
            console.error('Error importing transactions:', error);
            this.showNotification('Failed to import transactions', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize connected bank accounts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const bankAccountsCard = document.getElementById('connected-bank-accounts');
    if (bankAccountsCard) {
        new ConnectedBankAccounts('connected-bank-accounts');
    }
});

// Global functions for modal and actions
function connectBankAccount() {
    const bankAccounts = window.connectedBankAccountsInstance;
    if (bankAccounts) {
        bankAccounts.showConnectionModal();
    }
}

function closeBankConnectionModal() {
    const bankAccounts = window.connectedBankAccountsInstance;
    if (bankAccounts) {
        bankAccounts.hideConnectionModal();
    }
}

function submitBankConnection(event) {
    const bankAccounts = window.connectedBankAccountsInstance;
    if (bankAccounts) {
        bankAccounts.submitBankConnection(event);
    }
}

function importTransactions(bankId) {
    const bankAccounts = window.connectedBankAccountsInstance;
    if (bankAccounts) {
        bankAccounts.importTransactions(bankId);
    }
}
