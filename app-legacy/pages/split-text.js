// Vanilla JavaScript SplitText Animation
// Based on GSAP SplitText functionality but implemented without React

class SplitTextAnimation {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            delay: 100,
            duration: 0.6,
            ease: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            splitType: 'chars',
            from: { opacity: 0, y: 40 },
            to: { opacity: 1, y: 0 },
            threshold: 0.1,
            rootMargin: '-100px',
            onComplete: null,
            ...options
        };
        
        this.animationCompleted = false;
        this.observer = null;
        this.init();
    }

    init() {
        if (!this.element || !this.element.textContent) return;
        
        // Wait for fonts to load
        if (document.fonts && document.fonts.status !== 'loaded') {
            document.fonts.ready.then(() => this.splitText());
        } else {
            this.splitText();
        }
    }

    splitText() {
        const text = this.element.textContent;
        const splitType = this.options.splitType;
        
        // Clear existing content
        this.element.innerHTML = '';
        
        if (splitType === 'chars') {
            this.splitIntoChars(text);
        } else if (splitType === 'words') {
            this.splitIntoWords(text);
        } else if (splitType === 'lines') {
            this.splitIntoLines(text);
        }
        
        this.setupIntersectionObserver();
    }

    splitIntoChars(text) {
        const chars = text.split('');
        chars.forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char; // Non-breaking space
            span.className = 'split-char';
            span.style.cssText = `
                display: inline-block;
                opacity: ${this.options.from.opacity};
                transform: translateY(${this.options.from.y}px);
                transition: all ${this.options.duration}s ${this.options.ease} ${(index * this.options.delay) / 1000}s;
                will-change: transform, opacity;
            `;
            this.element.appendChild(span);
        });
    }

    splitIntoWords(text) {
        const words = text.split(' ');
        words.forEach((word, index) => {
            const span = document.createElement('span');
            span.textContent = word;
            span.className = 'split-word';
            span.style.cssText = `
                display: inline-block;
                opacity: ${this.options.from.opacity};
                transform: translateY(${this.options.from.y}px);
                transition: all ${this.options.duration}s ${this.options.ease} ${(index * this.options.delay) / 1000}s;
                will-change: transform, opacity;
                margin-right: 0.25em;
            `;
            this.element.appendChild(span);
        });
    }

    splitIntoLines(text) {
        // For lines, we'll split by words and wrap them
        const words = text.split(' ');
        let currentLine = document.createElement('div');
        currentLine.className = 'split-line';
        currentLine.style.cssText = `
            display: block;
            opacity: ${this.options.from.opacity};
            transform: translateY(${this.options.from.y}px);
            transition: all ${this.options.duration}s ${this.options.ease};
            will-change: transform, opacity;
            margin-bottom: 0.5em;
        `;
        
        words.forEach((word, index) => {
            const span = document.createElement('span');
            span.textContent = word + ' ';
            span.style.display = 'inline';
            currentLine.appendChild(span);
            
            // Simple line break logic (you might want to improve this)
            if (word.length > 10 || index % 4 === 0) {
                this.element.appendChild(currentLine);
                currentLine = document.createElement('div');
                currentLine.className = 'split-line';
                currentLine.style.cssText = `
                    display: block;
                    opacity: ${this.options.from.opacity};
                    transform: translateY(${this.options.from.y}px);
                    transition: all ${this.options.duration}s ${this.options.ease} ${(index * this.options.delay) / 1000}s;
                    will-change: transform, opacity;
                    margin-bottom: 0.5em;
                `;
            }
        });
        
        if (currentLine.textContent.trim()) {
            this.element.appendChild(currentLine);
        }
    }

    setupIntersectionObserver() {
        const threshold = this.options.threshold;
        const rootMargin = this.options.rootMargin;
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animationCompleted) {
                    this.animate();
                    this.animationCompleted = true;
                }
            });
        }, {
            threshold,
            rootMargin
        });
        
        this.observer.observe(this.element);
    }

    animate() {
        const elements = this.element.querySelectorAll('.split-char, .split-word, .split-line');
        
        elements.forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = this.options.to.opacity;
                el.style.transform = `translateY(${this.options.to.y}px)`;
                
                // Call onComplete for the last element
                if (index === elements.length - 1) {
                    setTimeout(() => {
                        this.options.onComplete?.();
                    }, this.options.duration * 1000);
                }
            }, index * this.options.delay);
        });
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // Reset element
        if (this.element) {
            this.element.innerHTML = this.element.textContent || '';
            this.element.style.cssText = '';
        }
    }
}

// Utility function to easily apply SplitText animation
function applySplitText(selector, options = {}) {
    const elements = document.querySelectorAll(selector);
    const instances = [];
    
    elements.forEach(element => {
        const instance = new SplitTextAnimation(element, options);
        instances.push(instance);
    });
    
    return instances;
}

// Export for use in other scripts
window.SplitTextAnimation = SplitTextAnimation;
window.applySplitText = applySplitText;
