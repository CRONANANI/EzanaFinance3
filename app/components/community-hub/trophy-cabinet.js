// Trophy Cabinet Component JavaScript

// Trophy Cabinet State
let trophyCabinetOpen = false;

// Initialize Trophy Cabinet
function initializeTrophyCabinet() {
    console.log('Trophy Cabinet initialized');
    
    // Add event listeners for keyboard navigation
    document.addEventListener('keydown', handleTrophyCabinetKeyboard);
    
    // Initialize trophy animations
    initializeTrophyAnimations();
}

// Show Trophy Cabinet
function showTrophyCabinet() {
    const cabinet = document.getElementById('trophy-cabinet');
    if (cabinet) {
        cabinet.classList.remove('hidden');
        cabinet.classList.add('show');
        trophyCabinetOpen = true;
        
        // Add body scroll lock
        document.body.style.overflow = 'hidden';
        
        // Animate trophy cards
        setTimeout(() => {
            animateTrophyCards();
        }, 300);
        
        console.log('Trophy Cabinet opened');
    }
}

// Close Trophy Cabinet
function closeTrophyCabinet() {
    const cabinet = document.getElementById('trophy-cabinet');
    if (cabinet) {
        cabinet.classList.remove('show');
        trophyCabinetOpen = false;
        
        // Remove body scroll lock
        document.body.style.overflow = '';
        
        // Hide cabinet after animation
        setTimeout(() => {
            cabinet.classList.add('hidden');
        }, 500);
        
        console.log('Trophy Cabinet closed');
    }
}

// Handle Keyboard Navigation
function handleTrophyCabinetKeyboard(event) {
    if (!trophyCabinetOpen) return;
    
    if (event.key === 'Escape') {
        closeTrophyCabinet();
    }
}

// Initialize Trophy Animations
function initializeTrophyAnimations() {
    // Add earned class to unlocked trophies
    const trophyCards = document.querySelectorAll('.trophy-card:not(.locked)');
    trophyCards.forEach((card, index) => {
        card.classList.add('earned');
        
        // Stagger the animation
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100);
        }, index * 100);
    });
}

// Animate Trophy Cards
function animateTrophyCards() {
    const trophyCards = document.querySelectorAll('.trophy-card');
    trophyCards.forEach((card, index) => {
        // Reset animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px) scale(0.9)';
        
        // Animate in
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
        }, index * 150);
    });
}

// Trophy Card Click Handler
function handleTrophyClick(trophyCard) {
    if (trophyCard.classList.contains('locked')) {
        // Show locked message
        showTrophyLockedMessage(trophyCard);
        return;
    }
    
    // Show trophy details
    showTrophyDetails(trophyCard);
}

// Show Trophy Locked Message
function showTrophyLockedMessage(trophyCard) {
    const title = trophyCard.querySelector('.trophy-title').textContent;
    const description = trophyCard.querySelector('.trophy-description').textContent;
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="bi bi-lock text-yellow-400"></i>
            <div>
                <div class="font-semibold">${title}</div>
                <div class="text-sm text-gray-300">${description}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Show Trophy Details
function showTrophyDetails(trophyCard) {
    const title = trophyCard.querySelector('.trophy-title').textContent;
    const description = trophyCard.querySelector('.trophy-description').textContent;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 transform scale-95 transition-transform duration-300">
            <div class="text-center">
                <div class="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="bi bi-trophy-fill text-2xl text-white"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">${title}</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4">${description}</p>
                <div class="text-sm text-gray-500 dark:text-gray-500 mb-4">
                    <i class="bi bi-check-circle text-green-500 mr-1"></i>
                    Achievement Unlocked
                </div>
                <button onclick="this.closest('.fixed').remove()" class="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => {
        modal.querySelector('.bg-white').style.transform = 'scale(1)';
    }, 100);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Update Trophy Progress
function updateTrophyProgress(trophyId, progress) {
    const trophyCard = document.querySelector(`[data-trophy-id="${trophyId}"]`);
    if (trophyCard) {
        const progressBar = trophyCard.querySelector('.trophy-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }
}

// Unlock Trophy
function unlockTrophy(trophyId) {
    const trophyCard = document.querySelector(`[data-trophy-id="${trophyId}"]`);
    if (trophyCard) {
        trophyCard.classList.remove('locked');
        trophyCard.classList.add('earned');
        
        // Animate unlock
        trophyCard.style.animation = 'trophyShine 1s ease-in-out';
        
        // Show unlock notification
        showTrophyUnlockedNotification(trophyCard);
    }
}

// Show Trophy Unlocked Notification
function showTrophyUnlockedNotification(trophyCard) {
    const title = trophyCard.querySelector('.trophy-title').textContent;
    
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="bi bi-trophy-fill text-2xl"></i>
            <div>
                <div class="font-bold">Trophy Unlocked!</div>
                <div class="text-sm">${title}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

// Export functions for global use
window.showTrophyCabinet = showTrophyCabinet;
window.closeTrophyCabinet = closeTrophyCabinet;
window.handleTrophyClick = handleTrophyClick;
window.updateTrophyProgress = updateTrophyProgress;
window.unlockTrophy = unlockTrophy;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTrophyCabinet);
