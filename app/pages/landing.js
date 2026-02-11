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

// Contact form modal
function openContactForm() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

function closeContactForm() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

function handleContactSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
    };
    const mailtoLink = 'mailto:support@ezanafinance.com?subject=' + encodeURIComponent(data.subject) + '&body=' + encodeURIComponent(
        'Name: ' + data.name + '\nEmail: ' + data.email + '\n\nMessage:\n' + data.message
    );
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

// Add hover effects to phone preview
document.addEventListener('DOMContentLoaded', function() {
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
