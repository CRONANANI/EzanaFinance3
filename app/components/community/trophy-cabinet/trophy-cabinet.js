/**
 * Trophy Cabinet Component
 * Manages the display and interaction of user achievements and badges
 */

class TrophyCabinet {
    constructor() {
        this.isOpen = false;
        this.trophyData = null;
        this.userStats = {
            trophiesEarned: 12,
            badgesUnlocked: 8,
            globalRank: 127
        };
        
        this.init();
    }

    init() {
        this.loadTrophyData();
        this.bindEvents();
    }

    /**
     * Load trophy data from API or local storage
     */
    async loadTrophyData() {
        try {
            // In a real app, this would fetch from an API
            this.trophyData = this.getMockTrophyData();
            console.log('Trophy data loaded:', this.trophyData);
        } catch (error) {
            console.error('Failed to load trophy data:', error);
            this.trophyData = this.getMockTrophyData();
        }
    }

    /**
     * Get mock trophy data for demonstration
     */
    getMockTrophyData() {
        return {
            categories: [
                {
                    id: 'investment-mastery',
                    name: 'Investment Mastery',
                    icon: 'bi-graph-up',
                    color1: '#fbbf24',
                    color2: '#f59e0b',
                    trophies: [
                        {
                            id: 'portfolio-pioneer',
                            name: 'Portfolio Pioneer',
                            description: 'First $10K portfolio',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-01-15',
                            rarity: 'common'
                        },
                        {
                            id: 'diversification-expert',
                            name: 'Diversification Expert',
                            description: '5+ asset classes',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-02-03',
                            rarity: 'uncommon'
                        },
                        {
                            id: 'risk-manager',
                            name: 'Risk Manager',
                            description: 'Low risk score',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-01-28',
                            rarity: 'common'
                        },
                        {
                            id: 'millionaire-maker',
                            name: 'Millionaire Maker',
                            description: '$1M portfolio value',
                            icon: 'bi-trophy',
                            earned: false,
                            rarity: 'legendary'
                        }
                    ]
                },
                {
                    id: 'community-leader',
                    name: 'Community Leader',
                    icon: 'bi-people-fill',
                    color1: '#ec4899',
                    color2: '#db2777',
                    trophies: [
                        {
                            id: 'social-butterfly',
                            name: 'Social Butterfly',
                            description: '50+ friends',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-02-10',
                            rarity: 'uncommon'
                        },
                        {
                            id: 'discussion-master',
                            name: 'Discussion Master',
                            description: '25+ helpful posts',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-01-20',
                            rarity: 'common'
                        },
                        {
                            id: 'mentor',
                            name: 'Mentor',
                            description: 'Helped 10+ users',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-02-05',
                            rarity: 'rare'
                        },
                        {
                            id: 'influencer',
                            name: 'Influencer',
                            description: '1000+ followers',
                            icon: 'bi-trophy',
                            earned: false,
                            rarity: 'epic'
                        }
                    ]
                },
                {
                    id: 'knowledge-seeker',
                    name: 'Knowledge Seeker',
                    icon: 'bi-book',
                    color1: '#ef4444',
                    color2: '#dc2626',
                    trophies: [
                        {
                            id: 'scholar',
                            name: 'Scholar',
                            description: 'Completed 5 courses',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-01-12',
                            rarity: 'common'
                        },
                        {
                            id: 'speed-learner',
                            name: 'Speed Learner',
                            description: '3 courses in 1 week',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-02-08',
                            rarity: 'uncommon'
                        },
                        {
                            id: 'research-expert',
                            name: 'Research Expert',
                            description: '100+ analyses',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-01-25',
                            rarity: 'rare'
                        },
                        {
                            id: 'market-guru',
                            name: 'Market Guru',
                            description: 'Perfect predictions',
                            icon: 'bi-trophy',
                            earned: false,
                            rarity: 'legendary'
                        }
                    ]
                },
                {
                    id: 'special-achievements',
                    name: 'Special Achievements',
                    icon: 'bi-star-fill',
                    color1: '#8b5cf6',
                    color2: '#7c3aed',
                    trophies: [
                        {
                            id: 'early-adopter',
                            name: 'Early Adopter',
                            description: 'Beta user',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2023-12-01',
                            rarity: 'epic'
                        },
                        {
                            id: 'streak-master',
                            name: 'Streak Master',
                            description: '30 day streak',
                            icon: 'bi-trophy-fill',
                            earned: true,
                            earnedDate: '2024-02-15',
                            rarity: 'rare'
                        },
                        {
                            id: 'night-owl',
                            name: 'Night Owl',
                            description: 'Late night trading',
                            icon: 'bi-trophy',
                            earned: false,
                            rarity: 'uncommon'
                        },
                        {
                            id: 'legend',
                            name: 'Legend',
                            description: 'All achievements',
                            icon: 'bi-trophy',
                            earned: false,
                            rarity: 'legendary'
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Make functions globally available
        window.showTrophyCabinet = () => this.show();
        window.closeTrophyCabinet = () => this.hide();
        window.handleTrophyClick = (element) => this.handleTrophyClick(element);
        window.viewAllAwards = () => this.show();
    }

    /**
     * Show the trophy cabinet
     */
    show() {
        const overlay = document.getElementById('trophy-cabinet');
        if (overlay) {
            overlay.style.display = 'flex';
            // Force reflow
            overlay.offsetHeight;
            overlay.classList.add('show');
            this.isOpen = true;
            this.renderTrophyCabinet();
            this.animateTrophies();
        } else {
            console.error('Trophy cabinet element not found');
        }
    }

    /**
     * Hide the trophy cabinet
     */
    hide() {
        const overlay = document.getElementById('trophy-cabinet');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
            this.isOpen = false;
        }
    }

    /**
     * Render the trophy cabinet content
     */
    renderTrophyCabinet() {
        this.updateStats();
        this.renderCategories();
    }

    /**
     * Update user statistics
     */
    updateStats() {
        const trophiesEarned = document.getElementById('trophies-earned');
        const badgesUnlocked = document.getElementById('badges-unlocked');
        const globalRank = document.getElementById('global-rank');

        if (trophiesEarned) trophiesEarned.textContent = this.userStats.trophiesEarned;
        if (badgesUnlocked) badgesUnlocked.textContent = this.userStats.badgesUnlocked;
        if (globalRank) globalRank.textContent = `#${this.userStats.globalRank}`;
    }

    /**
     * Render trophy categories
     */
    renderCategories() {
        const categoriesContainer = document.getElementById('trophy-categories');
        if (!categoriesContainer || !this.trophyData) return;

        categoriesContainer.innerHTML = '';

        this.trophyData.categories.forEach(category => {
            const categoryElement = this.createCategoryElement(category);
            categoriesContainer.appendChild(categoryElement);
        });
    }

    /**
     * Create a category element
     */
    createCategoryElement(category) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = `trophy-category ${category.id}`;
        categoryDiv.style.setProperty('--category-color-1', category.color1);
        categoryDiv.style.setProperty('--category-color-2', category.color2);

        categoryDiv.innerHTML = `
            <div class="trophy-category-header">
                <div class="trophy-category-icon">
                    <i class="bi ${category.icon}"></i>
                </div>
                <h3 class="trophy-category-title">${category.name}</h3>
            </div>
            <div class="trophy-category-trophies">
                ${category.trophies.map(trophy => this.createTrophyElement(trophy)).join('')}
            </div>
        `;

        return categoryDiv;
    }

    /**
     * Create a trophy element
     */
    createTrophyElement(trophy) {
        const earnedClass = trophy.earned ? '' : 'locked';
        const iconClass = trophy.earned ? 'bi-trophy-fill' : 'bi-trophy';
        
        return `
            <div class="trophy-item ${trophy.id} ${earnedClass}" 
                 onclick="handleTrophyClick(this)" 
                 data-trophy-id="${trophy.id}"
                 data-earned="${trophy.earned}"
                 data-rarity="${trophy.rarity}">
                <i class="trophy-icon ${iconClass}"></i>
                <div class="trophy-name">${trophy.name}</div>
                <div class="trophy-description">${trophy.description}</div>
                ${trophy.earned && trophy.earnedDate ? 
                    `<div class="trophy-date" style="font-size: 0.65rem; opacity: 0.8; margin-top: 0.25rem;">
                        Earned ${new Date(trophy.earnedDate).toLocaleDateString()}
                    </div>` : ''
                }
            </div>
        `;
    }

    /**
     * Handle trophy click
     */
    handleTrophyClick(element) {
        const trophyId = element.dataset.trophyId;
        const isEarned = element.dataset.earned === 'true';
        const rarity = element.dataset.rarity;

        if (isEarned) {
            this.showTrophyDetails(trophyId, rarity);
        } else {
            this.showTrophyRequirements(trophyId, rarity);
        }
    }

    /**
     * Show trophy details for earned trophies
     */
    showTrophyDetails(trophyId, rarity) {
        const trophy = this.findTrophyById(trophyId);
        if (!trophy) return;

        const rarityColors = {
            common: '#6b7280',
            uncommon: '#10b981',
            rare: '#3b82f6',
            epic: '#8b5cf6',
            legendary: '#f59e0b'
        };

        alert(`🏆 ${trophy.name}\n\n${trophy.description}\n\nRarity: ${rarity.toUpperCase()}\nEarned: ${trophy.earnedDate ? new Date(trophy.earnedDate).toLocaleDateString() : 'Unknown'}`);
    }

    /**
     * Show trophy requirements for locked trophies
     */
    showTrophyRequirements(trophyId, rarity) {
        const trophy = this.findTrophyById(trophyId);
        if (!trophy) return;

        alert(`🔒 ${trophy.name}\n\n${trophy.description}\n\nRarity: ${rarity.toUpperCase()}\n\nThis trophy is locked. Complete the requirements to unlock it!`);
    }

    /**
     * Find trophy by ID
     */
    findTrophyById(trophyId) {
        if (!this.trophyData) return null;

        for (const category of this.trophyData.categories) {
            const trophy = category.trophies.find(t => t.id === trophyId);
            if (trophy) return trophy;
        }
        return null;
    }

    /**
     * Animate trophies on reveal
     */
    animateTrophies() {
        const trophyItems = document.querySelectorAll('.trophy-item');
        trophyItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('revealed');
            }, index * 100);
        });
    }

    /**
     * Update user stats (for when new trophies are earned)
     */
    updateUserStats(newStats) {
        this.userStats = { ...this.userStats, ...newStats };
        if (this.isOpen) {
            this.updateStats();
        }
    }

    /**
     * Add a new trophy (for when user earns one)
     */
    addTrophy(categoryId, trophyId) {
        if (!this.trophyData) return;

        const category = this.trophyData.categories.find(c => c.id === categoryId);
        if (category) {
            const trophy = category.trophies.find(t => t.id === trophyId);
            if (trophy) {
                trophy.earned = true;
                trophy.earnedDate = new Date().toISOString().split('T')[0];
                this.userStats.trophiesEarned++;
                this.userStats.badgesUnlocked++;
                
                if (this.isOpen) {
                    this.renderTrophyCabinet();
                    this.animateTrophies();
                }
            }
        }
    }
}

// Initialize the trophy cabinet when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.trophyCabinet = new TrophyCabinet();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrophyCabinet;
}
