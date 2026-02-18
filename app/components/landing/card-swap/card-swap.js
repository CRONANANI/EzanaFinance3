// CardSwap Component - Vanilla JavaScript version of React CardSwap
// Converted from React to vanilla JS with GSAP animations

class CardSwap {
  constructor(container, options = {}) {
    console.log('CardSwap constructor called with container:', container);
    this.container = container;
    this.options = {
      width: 500,
      height: 400,
      cardDistance: 60,
      verticalDistance: 70,
      delay: 5000,
      pauseOnHover: false,
      onCardClick: null,
      skewAmount: 6,
      easing: 'elastic',
      ...options
    };

    this.cards = [];
    this.order = [];
    this.timeline = null;
    this.interval = null;
    this.isPaused = false;

    this.init();
  }

  init() {
    this.setupCards();
    this.setupAnimations();
    this.startAutoSwap();
    
    if (this.options.pauseOnHover) {
      this.setupHoverEvents();
    }
  }

  setupCards() {
    // Get all card elements
    this.cards = Array.from(this.container.querySelectorAll('.card'));
    console.log('CardSwap setupCards: Found', this.cards.length, 'cards');
    console.log('CardSwap container:', this.container);
    console.log('CardSwap cards:', this.cards);
    
    // Initialize order array
    this.order = Array.from({ length: this.cards.length }, (_, i) => i);
    
    // Set initial positions
    this.cards.forEach((card, i) => {
      const slot = this.makeSlot(i, this.options.cardDistance, this.options.verticalDistance, this.cards.length);
      this.placeCard(card, slot, this.options.skewAmount);
      
      // Add click event
      card.addEventListener('click', (e) => {
        if (this.options.onCardClick) {
          this.options.onCardClick(i);
        }
      });
    });
  }

  makeSlot(i, distX, distY, total) {
    return {
      x: i * distX,
      y: -i * distY,
      z: -i * distX * 1.5,
      zIndex: total - i
    };
  }

  placeCard(card, slot, skew) {
    gsap.set(card, {
      x: slot.x,
      y: slot.y,
      z: slot.z,
      xPercent: -50,
      yPercent: -50,
      skewY: skew,
      transformOrigin: 'center center',
      zIndex: slot.zIndex,
      force3D: true
    });
  }

  setupAnimations() {
    // Animation configuration for smooth, fluid motion
    this.config = {
      ease: 'power3.inOut',
      durDrop: 1.4,
      durMove: 1.2,
      durReturn: 1.2,
      promoteOverlap: 0.85,
      returnDelay: 0.05,
      stagger: 0.08
    };
  }

  swap() {
    if (this.order.length < 2 || this.isPaused) return;

    const [front, ...rest] = this.order;
    const frontCard = this.cards[front];
    const timeline = gsap.timeline();
    this.timeline = timeline;

    // Drop front card - smooth arc
    timeline.to(frontCard, {
      y: '+=80',
      duration: this.config.durDrop,
      ease: this.config.ease,
      overwrite: 'auto'
    });

    // Promote remaining cards - fluid staggered movement
    timeline.addLabel('promote', `-=${this.config.durDrop * this.config.promoteOverlap}`);
    rest.forEach((idx, i) => {
      const card = this.cards[idx];
      const slot = this.makeSlot(i, this.options.cardDistance, this.options.verticalDistance, this.cards.length);
      
      timeline.set(card, { zIndex: slot.zIndex }, 'promote');
      timeline.to(card, {
        x: slot.x,
        y: slot.y,
        z: slot.z,
        duration: this.config.durMove,
        ease: this.config.ease,
        overwrite: 'auto'
      }, `promote+=${i * (this.config.stagger || 0.15)}`);
    });

    // Return front card to back
    const backSlot = this.makeSlot(this.cards.length - 1, this.options.cardDistance, this.options.verticalDistance, this.cards.length);
    timeline.addLabel('return', `promote+=${this.config.durMove * this.config.returnDelay}`);
    timeline.call(() => {
      gsap.set(frontCard, { zIndex: backSlot.zIndex });
    }, undefined, 'return');
    timeline.to(frontCard, {
      x: backSlot.x,
      y: backSlot.y,
      z: backSlot.z,
      duration: this.config.durReturn,
      ease: this.config.ease,
      overwrite: 'auto'
    }, 'return');

    // Update order
    timeline.call(() => {
      this.order = [...rest, front];
    });
  }

  startAutoSwap() {
    this.swap(); // Initial swap
    this.interval = setInterval(() => {
      this.swap();
    }, this.options.delay);
  }

  setupHoverEvents() {
    this.container.addEventListener('mouseenter', () => {
      this.pause();
    });
    
    this.container.addEventListener('mouseleave', () => {
      this.resume();
    });
  }

  pause() {
    this.isPaused = true;
    if (this.timeline) {
      this.timeline.pause();
    }
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  resume() {
    this.isPaused = false;
    if (this.timeline) {
      this.timeline.play();
    }
    this.startAutoSwap();
  }

  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.timeline) {
      this.timeline.kill();
    }
  }
}

// Utility function to create CardSwap instance
function createCardSwap(containerSelector, options = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error('CardSwap container not found:', containerSelector);
    return null;
  }
  
  return new CardSwap(container, options);
}

// Export for use
window.CardSwap = CardSwap;
window.createCardSwap = createCardSwap;
