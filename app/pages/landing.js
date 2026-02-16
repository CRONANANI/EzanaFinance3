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

// Contact support modal - legacy compatibility
function openContactForm() {
    var dialog = document.getElementById('supportDialog');
    if (dialog) {
        dialog.classList.add('active');
        dialog.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

function closeContactForm() {
    var dialog = document.getElementById('supportDialog');
    if (dialog) {
        dialog.classList.remove('active');
        dialog.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        var dialog = document.getElementById('supportDialog');
        if (dialog && dialog.classList.contains('active')) {
            closeContactForm();
        }
    }
});

/** IntelligenceCarousel - Market Intelligence one-slide carousel */
function IntelligenceCarousel() {
    var track = document.getElementById('carouselTrack');
    var slides = track ? track.querySelectorAll('.carousel-slide') : [];
    var prevBtn = document.getElementById('carouselPrev');
    var nextBtn = document.getElementById('carouselNext');
    var indicators = document.getElementById('carouselIndicators');
    indicators = indicators ? indicators.querySelectorAll('.indicator') : [];
    var currentSlide = 0;
    var totalSlides = slides.length;
    var autoPlayInterval = null;

    if (!track || !slides.length) return;

    function goToSlide(index) {
        slides.forEach(function (s) { s.classList.remove('active'); });
        indicators.forEach(function (i) { i.classList.remove('active'); });
        slides[index].classList.add('active');
        if (indicators[index]) indicators[index].classList.add('active');
        track.style.transform = 'translateX(-' + index + '00%)';
        currentSlide = index;
    }

    function nextSlide() {
        goToSlide((currentSlide + 1) % totalSlides);
    }
    function prevSlide() {
        goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
    }
    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 5000);
    }
    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    indicators.forEach(function (ind, i) {
        ind.addEventListener('click', function () { goToSlide(i); });
    });
    var container = track.closest('.intelligence-carousel');
    if (container) {
        container.addEventListener('mouseenter', stopAutoPlay);
        container.addEventListener('mouseleave', startAutoPlay);
    }
    startAutoPlay();
    window.intelligenceCarousel = { goToSlide: goToSlide, nextSlide: nextSlide, prevSlide: prevSlide };
}

/** PricingToggle - Monthly/Annual pricing switch */
function PricingToggle() {
    var toggleBtns = document.querySelectorAll('.pricing-toggle .toggle-btn');
    var monthlyPrices = document.querySelectorAll('.monthly-price');
    var annualPrices = document.querySelectorAll('.annual-price');
    toggleBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var plan = btn.dataset.plan;
            toggleBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.plan === plan); });
            if (plan === 'monthly') {
                monthlyPrices.forEach(function (p) { p.style.display = 'inline'; });
                annualPrices.forEach(function (p) { p.style.display = 'none'; });
            } else {
                monthlyPrices.forEach(function (p) { p.style.display = 'none'; });
                annualPrices.forEach(function (p) { p.style.display = 'inline'; });
            }
        });
    });
}

/** SupportDialog - Contact Support modal */
function SupportDialog() {
    var dialog = document.getElementById('supportDialog');
    var form = document.getElementById('supportForm');
    var successEl = document.getElementById('supportSuccess');
    var closeBtn = document.getElementById('dialogClose');
    var closeBtn2 = document.getElementById('supportDialogCloseBtn');
    var triggerBtns = document.querySelectorAll('[data-support-trigger]');

    if (!dialog || !form) return;

    function open() {
        dialog.classList.add('active');
        dialog.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
    function close() {
        dialog.classList.remove('active');
        dialog.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        setTimeout(function () {
            form.reset();
            form.style.display = 'flex';
            if (successEl) successEl.style.display = 'none';
        }, 300);
    }

    triggerBtns.forEach(function (btn) { btn.addEventListener('click', open); });
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (closeBtn2) closeBtn2.addEventListener('click', close);
    dialog.addEventListener('click', function (e) {
        if (e.target === dialog) close();
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var data = {
            name: form.name.value,
            email: form.email.value,
            category: form.category.value,
            message: form.message.value
        };
        var bodyText = 'Name: ' + data.name + '\nEmail: ' + data.email + '\nCategory: ' + data.category + '\n\nMessage:\n' + data.message;
        var mailto = 'mailto:support@ezanafinance.com?subject=' + encodeURIComponent('Support: ' + data.category) + '&body=' + encodeURIComponent(bodyText);
        window.location.href = mailto;
        form.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
    });
}

/** Simple FAQ Accordion for flat faq-item structure */
function FAQAccordion() {
    var items = document.querySelectorAll('.faq-section .faq-item');
    items.forEach(function (item) {
        var q = item.querySelector('.faq-question');
        var a = item.querySelector('.faq-answer');
        if (!q || !a) return;
        q.addEventListener('click', function (e) {
            e.preventDefault();
            var isActive = item.classList.contains('active');
            items.forEach(function (other) {
                if (other !== item) {
                    other.classList.remove('active');
                    var oa = other.querySelector('.faq-answer');
                    if (oa) oa.style.maxHeight = '';
                }
            });
            if (!isActive) {
                item.classList.add('active');
                a.style.maxHeight = a.scrollHeight + 'px';
            } else {
                item.classList.remove('active');
                a.style.maxHeight = '';
            }
        });
    });
}

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

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('carouselTrack')) IntelligenceCarousel();
    if (document.querySelector('.pricing-toggle')) PricingToggle();
    SupportDialog();

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
