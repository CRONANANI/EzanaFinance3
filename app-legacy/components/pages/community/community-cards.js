// Community Cards Component JavaScript
class CommunityCards {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const cards = this.container.querySelectorAll('.community-card');
        
        cards.forEach((card, index) => {
            card.addEventListener('click', () => {
                this.handleCardClick(index, card);
            });
            
            card.addEventListener('mouseenter', () => {
                this.handleCardHover(card, true);
            });
            
            card.addEventListener('mouseleave', () => {
                this.handleCardHover(card, false);
            });
        });
    }

    handleCardClick(index, card) {
        console.log(`Clicked community card ${index}`);
        
        // Add click animation
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
        
        // Navigate to relevant page or show modal
        switch (index) {
            case 0: // Start Discussion
                this.startDiscussion();
                break;
            case 1: // Browse Threads
                this.browseThreads();
                break;
            case 2: // My Communities
                this.manageCommunities();
                break;
            case 3: // View Awards
                this.viewAwards();
                break;
        }
    }

    handleCardHover(card, isHovering) {
        if (isHovering) {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
        } else {
            card.style.transform = '';
            card.style.boxShadow = '';
        }
    }

    startDiscussion() {
        // Show start discussion modal or navigate to discussion page
        console.log('Starting new discussion');
        // You can implement a modal or redirect to a discussion creation page
        this.showModal('Start Discussion', 'Create a new discussion thread');
    }

    browseThreads() {
        // Navigate to threads page or show threads list
        console.log('Browsing threads');
        // You can implement navigation to a threads page
        window.location.href = '#threads';
    }

    manageCommunities() {
        // Show communities management page
        console.log('Managing communities');
        this.showModal('My Communities', 'Manage your joined communities');
    }

    viewAwards() {
        // Show awards page or modal
        console.log('Viewing awards');
        this.showModal('Awards & Recognition', 'View your community achievements');
    }

    showModal(title, content) {
        // Create a simple modal for demonstration
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${content}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary">OK</button>
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
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.cssText = `
            background: #1e293b;
            border-radius: 1rem;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        document.body.appendChild(modal);
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.modal-close');
        const okBtn = modal.querySelector('.btn-primary');
        
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        closeBtn.addEventListener('click', closeModal);
        okBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
}

// Initialize community cards when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const communityCards = document.getElementById('community-cards');
    if (communityCards) {
        new CommunityCards('community-cards');
    }
});
