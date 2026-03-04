// Income vs Expenses Card Component JavaScript
class IncomeVsExpenses {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = {
            income: 5200.00,
            expenses: 3876.54,
            netSavings: 0,
            savingsRate: 0
        };
        this.init();
    }

    init() {
        this.calculateNetSavings();
        this.loadIncomeExpenseData();
        this.setupEventListeners();
    }

    calculateNetSavings() {
        this.data.netSavings = this.data.income - this.data.expenses;
        this.data.savingsRate = (this.data.netSavings / this.data.income) * 100;
    }

    async loadIncomeExpenseData() {
        try {
            // Simulate API call
            const data = {
                income: 5200.00,
                expenses: 3876.54
            };
            
            this.data.income = data.income;
            this.data.expenses = data.expenses;
            this.calculateNetSavings();
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading income/expense data:', error);
        }
    }

    updateDisplay() {
        // Update income amount
        const incomeAmount = this.container.querySelector('.income-amount');
        if (incomeAmount) {
            incomeAmount.textContent = `$${this.data.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }

        // Update expenses amount
        const expensesAmount = this.container.querySelector('.expenses-amount');
        if (expensesAmount) {
            expensesAmount.textContent = `$${this.data.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }

        // Update net savings
        const savingsAmount = this.container.querySelector('.savings-amount');
        if (savingsAmount) {
            savingsAmount.innerHTML = `
                $${this.data.netSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <div class="savings-rate">${this.data.savingsRate.toFixed(1)}% savings rate</div>
            `;
        }
    }

    setupEventListeners() {
        // Add any event listeners here
    }

    updateIncome(newIncome) {
        this.data.income = newIncome;
        this.calculateNetSavings();
        this.updateDisplay();
    }

    updateExpenses(newExpenses) {
        this.data.expenses = newExpenses;
        this.calculateNetSavings();
        this.updateDisplay();
    }

    getSavingsRate() {
        return this.data.savingsRate;
    }

    getNetSavings() {
        return this.data.netSavings;
    }

    exportData() {
        const exportData = {
            income: this.data.income,
            expenses: this.data.expenses,
            netSavings: this.data.netSavings,
            savingsRate: this.data.savingsRate,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `income-vs-expenses-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showDetailedBreakdown() {
        // Create modal with detailed breakdown
        const modal = document.createElement('div');
        modal.className = 'income-expenses-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detailed Income vs Expenses Breakdown</h3>
                    <button onclick="this.closest('.income-expenses-modal').remove()" class="modal-close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="breakdown-section">
                        <h4>Income Breakdown</h4>
                        <div class="breakdown-item">
                            <span>Salary</span>
                            <span>$${this.data.income.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="breakdown-section">
                        <h4>Expenses Breakdown</h4>
                        <div class="breakdown-item">
                            <span>Housing</span>
                            <span>$1,500.00</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Food</span>
                            <span>$800.00</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Transportation</span>
                            <span>$400.00</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Other</span>
                            <span>$${(this.data.expenses - 2700).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="breakdown-section">
                        <h4>Summary</h4>
                        <div class="breakdown-item total">
                            <span>Net Savings</span>
                            <span>$${this.data.netSavings.toLocaleString()}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Savings Rate</span>
                            <span>${this.data.savingsRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        document.body.appendChild(modal);
    }
}

// Initialize income vs expenses when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const incomeExpensesCard = document.getElementById('income-vs-expenses');
    if (incomeExpensesCard) {
        new IncomeVsExpenses('income-vs-expenses');
    }
});
