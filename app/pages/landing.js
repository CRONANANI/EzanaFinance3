// Landing Page JavaScript

// Demo functionality
function showDemo() {
    alert('Demo functionality coming soon! This would show a preview of the Ezana Finance dashboard.');
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
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

    // Add loading animation to buttons
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.classList.contains('btn-primary')) {
                // Add loading state for primary button
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
                this.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.pointerEvents = 'auto';
                }, 2000);
            }
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

    // Apply ElectricBorder animation to Sign Up button
    const signUpButton = document.querySelector('.btn-primary');
    if (signUpButton) {
        applyElectricBorder('.btn-primary', {
            color: '#10b981',
            speed: 1.2,
            chaos: 0.8,
            thickness: 2
        });
    }

    // Apply ElectricBorder animation to Sign In button
    const signInButton = document.querySelector('.btn-secondary');
    if (signInButton) {
        applyElectricBorder('.btn-secondary', {
            color: '#10b981',
            speed: 0.8,
            chaos: 1.2,
            thickness: 1
        });
    }

    // Apply ElectricBorder animation to View Demo button
    const demoButton = document.querySelector('.btn-tertiary');
    if (demoButton) {
        applyElectricBorder('.btn-tertiary', {
            color: '#10b981',
            speed: 0.6,
            chaos: 1.5,
            thickness: 1
        });
    }

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
