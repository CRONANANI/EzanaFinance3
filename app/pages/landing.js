// Landing Page JavaScript

// Smooth scrolling for anchor links (skip # and #!)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '#!') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Contact support modal
function openContactForm() {
    var modal = document.getElementById('contactModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        var firstInput = document.getElementById('contact-name');
        if (firstInput) {
            setTimeout(function () { firstInput.focus(); }, 100);
        }
    }
}

function closeContactForm() {
    var modal = document.getElementById('contactModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

function handleContactSubmit(event) {
    event.preventDefault();
    var form = event.target;
    var formData = new FormData(form);
    var data = {
        name: formData.get('name'),
        email: formData.get('email'),
        type: formData.get('type') || 'General Inquiry',
        subject: formData.get('subject'),
        message: formData.get('message')
    };
    var bodyText = 'Name: ' + data.name + '\nEmail: ' + data.email + '\nRequest Type: ' + data.type + '\n\nMessage:\n' + data.message;
    var mailtoLink = 'mailto:support@ezanafinance.com?subject=' + encodeURIComponent('[Support] ' + data.subject) + '&body=' + encodeURIComponent(bodyText);
    window.location.href = mailtoLink;
    try {
        alert('Opening your email client... If it doesn\'t open automatically, please email us at support@ezanafinance.com');
    } catch (err) {}
    closeContactForm();
    form.reset();
    return false;
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        var modal = document.getElementById('contactModal');
        if (modal && modal.classList.contains('active')) {
            closeContactForm();
        }
    }
});

/** Antigravity Center - Hide when cursor below hero CTA or when scrolled past hero */
function AntigravityCenterHider() {
    this.heroSection = document.getElementById('heroSection');
    this.heroCTA = document.querySelector('.hero-cta');
    this.centerComponent = document.getElementById('antigravityCenterComponent');
    this.lastMouseY = 0;
    if (!this.centerComponent || !this.heroSection) return;
    var self = this;

    function hideCenter() {
        self.centerComponent.style.opacity = '0';
        self.centerComponent.style.pointerEvents = 'none';
    }
    function showCenter() {
        self.centerComponent.style.opacity = '1';
        self.centerComponent.style.pointerEvents = 'auto';
    }

    document.addEventListener('mousemove', function (e) {
        self.lastMouseY = e.clientY;
        var heroBottom = self.heroSection.getBoundingClientRect().bottom;
        if (heroBottom < 0) { hideCenter(); return; }
        if (!self.heroCTA) { showCenter(); return; }
        var ctaBottom = self.heroCTA.getBoundingClientRect().bottom + window.scrollY;
        var mouseY = e.clientY + window.scrollY;
        if (mouseY > ctaBottom) hideCenter();
        else showCenter();
    });

    window.addEventListener('scroll', function () {
        var heroBottom = self.heroSection.getBoundingClientRect().bottom;
        if (heroBottom < 0) { hideCenter(); return; }
        if (!self.heroCTA) { showCenter(); return; }
        var ctaBottom = self.heroCTA.getBoundingClientRect().bottom + window.scrollY;
        var mouseY = self.lastMouseY + window.scrollY;
        if (mouseY > ctaBottom) hideCenter();
        else showCenter();
    });
}

/** Resources carousel - auto-rotating */
function ResourcesCarousel() {
    var root = document.getElementById('resources');
    if (!root) return;
    this.track = root.querySelector('.carousel-track');
    this.cards = root.querySelectorAll('.resource-card');
    this.prevButton = root.querySelector('.carousel-prev');
    this.nextButton = root.querySelector('.carousel-next');
    this.indicators = root.querySelectorAll('.indicator');
    this.currentIndex = 0;
    this.autoplayInterval = null;
    this.autoplayDelay = 5000;
    var self = this;
    function getGap() {
        var track = self.track;
        if (track && window.getComputedStyle) {
            var g = getComputedStyle(track).gap;
            if (g && g !== 'normal') return parseFloat(g) || 32;
        }
        return 32;
    }
    function getCardsPerView() {
        var w = window.innerWidth;
        if (w < 768) return 1;
        if (w < 1024) return 2;
        return 3;
    }
    this.getCardsPerView = getCardsPerView;
    this.cardsPerView = getCardsPerView();
    this.maxIndex = Math.max(0, (this.cards.length || 0) - this.cardsPerView);
    if (!this.track || !this.cards.length) return;
    function getCardStep() {
        /* Use actual rendered card width for accurate scrolling */
        var gap = getGap();
        var first = self.cards[0];
        if (first && first.offsetWidth > 0) return first.offsetWidth + gap;
        var trackContainer = self.track.parentElement;
        var containerWidth = trackContainer ? trackContainer.offsetWidth : root.offsetWidth || window.innerWidth;
        if (containerWidth <= 0) return 312;
        return (containerWidth - gap * (self.cardsPerView - 1)) / self.cardsPerView + gap;
    }
    function updateCarousel() {
        self.cardsPerView = getCardsPerView();
        self.maxIndex = Math.max(0, self.cards.length - self.cardsPerView);
        self.currentIndex = Math.min(self.currentIndex, self.maxIndex);
        var step = getCardStep();
        var offset = -(self.currentIndex * step);
        self.track.style.transform = 'translateX(' + Math.round(offset) + 'px)';
        if (self.prevButton) self.prevButton.disabled = self.currentIndex <= 0;
        if (self.nextButton) self.nextButton.disabled = self.currentIndex >= self.maxIndex;
        self.indicators.forEach(function (ind, i) {
            ind.classList.toggle('active', i === self.currentIndex);
        });
    }
    this.updateCarousel = updateCarousel;
    function next() {
        if (self.currentIndex < self.maxIndex) {
            self.currentIndex++;
        } else {
            self.currentIndex = 0;
        }
        updateCarousel();
    }
    this.next = next;
    this.prev = function () {
        if (self.currentIndex > 0) {
            self.currentIndex--;
            updateCarousel();
        }
    };
    this.goToSlide = function (index) {
        self.currentIndex = Math.min(index, self.maxIndex);
        updateCarousel();
    };
    if (this.prevButton) this.prevButton.addEventListener('click', function () { self.prev(); });
    if (this.nextButton) this.nextButton.addEventListener('click', function () { next(); });
    this.indicators.forEach(function (ind, i) {
        ind.addEventListener('click', function () { self.goToSlide(i); });
    });
    var container = root.querySelector('.resources-carousel');
    if (container) {
        container.addEventListener('mouseenter', function () {
            if (self.autoplayInterval) clearInterval(self.autoplayInterval);
            self.autoplayInterval = null;
        });
        container.addEventListener('mouseleave', function () {
            self.autoplayInterval = setInterval(next, self.autoplayDelay);
        });
    }
    window.addEventListener('resize', function () {
        self.cardsPerView = getCardsPerView();
        self.maxIndex = Math.max(0, self.cards.length - self.cardsPerView);
        self.currentIndex = Math.min(self.currentIndex, self.maxIndex);
        updateCarousel();
    });
    updateCarousel();
    /* Defer updates in case layout wasn't ready (e.g. section off-screen) */
    setTimeout(updateCarousel, 100);
    setTimeout(updateCarousel, 500);
    /* Recalc when resources section becomes visible */
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function () { updateCarousel(); }, { threshold: 0.01 });
        io.observe(root);
    }
    this.autoplayInterval = setInterval(next, this.autoplayDelay);
}

// Add hover effects to phone preview
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('antigravityCenterComponent')) {
        window.lastMouseY = 0;
        document.addEventListener('mousemove', function (e) { window.lastMouseY = e.clientY; });
        window.antigravityCenterHider = new AntigravityCenterHider();
    }
    if (document.querySelector('.resources-carousel')) {
        window.resourcesCarousel = new ResourcesCarousel();
    }

    const phoneContainer = document.querySelector('.phone-container');
    if (phoneContainer) {
        phoneContainer.addEventListener('mouseenter', function() {
            this.style.transform = 'rotate(-5deg) scale(1.05)';
        });
        
        phoneContainer.addEventListener('mouseleave', function() {
            this.style.transform = 'rotate(-5deg) scale(1)';
        });
    }

    // Handle stats section scroll behavior
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        let hasScrolled = false;
        
        window.addEventListener('scroll', function() {
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            // Show stats section when user scrolls down
            if (scrollY > 100 && !hasScrolled) {
                statsSection.style.bottom = '0';
                hasScrolled = true;
            }
            
            // Hide stats section when user scrolls back to top
            if (scrollY < 50 && hasScrolled) {
                statsSection.style.bottom = '-50%';
                hasScrolled = false;
            }
        });
    }

    // Animate stats on scroll
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat-number');
                statNumbers.forEach(stat => {
                    const finalValue = stat.textContent;
                    const isPercentage = finalValue.includes('%');
                    const isPlus = finalValue.includes('+');
                    const isDollar = finalValue.includes('$');
                    const isK = finalValue.includes('K');
                    const isB = finalValue.includes('B');
                    
                    let numericValue = parseFloat(finalValue.replace(/[^\d.]/g, ''));
                    if (isK) numericValue *= 1000;
                    if (isB) numericValue *= 1000000000;
                    
                    let current = 0;
                    const increment = numericValue / 50;
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= numericValue) {
                            current = numericValue;
                            clearInterval(timer);
                        }
                        
                        let displayValue = Math.floor(current);
                        if (isK) displayValue = (displayValue / 1000).toFixed(0) + 'K';
                        if (isB) displayValue = (displayValue / 1000000000).toFixed(1) + 'B';
                        if (isDollar) displayValue = '$' + displayValue;
                        if (isPlus) displayValue += '+';
                        if (isPercentage) displayValue += '%';
                        
                        stat.textContent = displayValue;
                    }, 30);
                });
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        observer.observe(statsSection);
    }

    // Add loading animation to text links
    const textLinks = document.querySelectorAll('.cta-text-link');
    textLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Add loading state for text links
            const originalText = this.textContent;
            this.textContent = 'Loading...';
            this.style.pointerEvents = 'none';
            
            setTimeout(() => {
                this.textContent = originalText;
                this.style.pointerEvents = 'auto';
            }, 2000);
        });
    });

    // Add parallax effect to background elements
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.glow-circle');
        
        parallaxElements.forEach((element, index) => {
            const speed = 0.5 + (index * 0.1);
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });

    // Hero title animation removed - text remains statically positioned

    // Hero description animation removed - text remains statically positioned

    // Apply SplitText animation to statistics
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach((stat, index) => {
        // Add a unique class for targeting
        stat.classList.add(`stat-number-${index}`);
        applySplitText(`.stat-number-${index}`, {
            splitType: 'chars',
            delay: 30,
            duration: 0.5,
            from: { opacity: 0, scale: 0.5 },
            to: { opacity: 1, scale: 1 },
            threshold: 0.3,
            rootMargin: '-50px'
        });
    });

    // Text links are now pure text without electric border animations

    // Add mobile menu toggle (for future mobile navigation)
    const createMobileMenu = () => {
        const nav = document.querySelector('.navbar .nav-container');
        const navMenu = document.querySelector('.nav-menu');
        
        if (window.innerWidth <= 768) {
            // Create mobile menu button if it doesn't exist
            if (!document.querySelector('.mobile-menu-btn')) {
                const mobileBtn = document.createElement('button');
                mobileBtn.className = 'mobile-menu-btn';
                mobileBtn.innerHTML = '<i class="bi bi-list"></i>';
                mobileBtn.style.cssText = `
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    display: block;
                `;
                
                nav.appendChild(mobileBtn);
                
                mobileBtn.addEventListener('click', () => {
                    navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
                });
            }
            
            navMenu.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: rgba(16, 185, 129, 0.95);
                backdrop-filter: blur(10px);
                flex-direction: column;
                padding: 1rem;
                display: none;
                border-radius: 0 0 1rem 1rem;
            `;
        } else {
            // Reset for desktop
            const mobileBtn = document.querySelector('.mobile-menu-btn');
            if (mobileBtn) mobileBtn.remove();
            
            navMenu.style.cssText = '';
        }
    };

    // Initialize mobile menu
    createMobileMenu();
    window.addEventListener('resize', createMobileMenu);
});
