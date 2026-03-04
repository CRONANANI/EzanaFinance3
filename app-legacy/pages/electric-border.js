// Vanilla JavaScript ElectricBorder Animation
// Based on React ElectricBorder component but implemented without React

class ElectricBorder {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            color: '#10b981', // Default to green to match the theme
            speed: 1,
            chaos: 1,
            thickness: 2,
            ...options
        };
        
        this.filterId = `turbulent-displace-${Math.random().toString(36).substr(2, 9)}`;
        this.svgRef = null;
        this.strokeRef = null;
        this.resizeObserver = null;
        
        this.init();
    }

    init() {
        if (!this.element) return;
        
        // Create the electric border structure
        this.createStructure();
        
        // Set up resize observer
        this.setupResizeObserver();
        
        // Initial animation setup
        this.updateAnimation();
    }

    createStructure() {
        // Add electric border class to the element
        this.element.classList.add('electric-border');
        
        // Set CSS custom properties
        this.element.style.setProperty('--electric-border-color', this.options.color);
        this.element.style.setProperty('--eb-border-width', `${this.options.thickness}px`);
        
        // Create SVG filter
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.className = 'eb-svg';
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.id = this.filterId;
        filter.setAttribute('colorInterpolationFilters', 'sRGB');
        filter.setAttribute('x', '-20%');
        filter.setAttribute('y', '-20%');
        filter.setAttribute('width', '140%');
        filter.setAttribute('height', '140%');
        
        // Create turbulence and offset elements
        this.createTurbulenceElements(filter);
        
        defs.appendChild(filter);
        svg.appendChild(defs);
        
        // Create layers structure
        const layers = document.createElement('div');
        layers.className = 'eb-layers';
        
        // Create stroke layer
        const stroke = document.createElement('div');
        stroke.className = 'eb-stroke';
        this.strokeRef = stroke;
        
        // Create glow layers
        const glow1 = document.createElement('div');
        glow1.className = 'eb-glow-1';
        
        const glow2 = document.createElement('div');
        glow2.className = 'eb-glow-2';
        
        const backgroundGlow = document.createElement('div');
        backgroundGlow.className = 'eb-background-glow';
        
        layers.appendChild(stroke);
        layers.appendChild(glow1);
        layers.appendChild(glow2);
        layers.appendChild(backgroundGlow);
        
        // Create content wrapper
        const content = document.createElement('div');
        content.className = 'eb-content';
        
        // Move existing content to the content wrapper
        while (this.element.firstChild) {
            content.appendChild(this.element.firstChild);
        }
        
        // Append all elements
        this.element.appendChild(svg);
        this.element.appendChild(layers);
        this.element.appendChild(content);
        
        this.svgRef = svg;
    }

    createTurbulenceElements(filter) {
        // Noise 1 - Vertical animation
        const turbulence1 = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
        turbulence1.setAttribute('type', 'turbulence');
        turbulence1.setAttribute('baseFrequency', '0.02');
        turbulence1.setAttribute('numOctaves', '10');
        turbulence1.setAttribute('result', 'noise1');
        turbulence1.setAttribute('seed', '1');
        
        const offset1 = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
        offset1.setAttribute('in', 'noise1');
        offset1.setAttribute('dx', '0');
        offset1.setAttribute('dy', '0');
        offset1.setAttribute('result', 'offsetNoise1');
        
        const animate1 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate1.setAttribute('attributeName', 'dy');
        animate1.setAttribute('values', '700; 0');
        animate1.setAttribute('dur', '6s');
        animate1.setAttribute('repeatCount', 'indefinite');
        animate1.setAttribute('calcMode', 'linear');
        
        offset1.appendChild(animate1);
        
        // Noise 2 - Vertical animation (reverse)
        const turbulence2 = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
        turbulence2.setAttribute('type', 'turbulence');
        turbulence2.setAttribute('baseFrequency', '0.02');
        turbulence2.setAttribute('numOctaves', '10');
        turbulence2.setAttribute('result', 'noise2');
        turbulence2.setAttribute('seed', '1');
        
        const offset2 = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
        offset2.setAttribute('in', 'noise2');
        offset2.setAttribute('dx', '0');
        offset2.setAttribute('dy', '0');
        offset2.setAttribute('result', 'offsetNoise2');
        
        const animate2 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate2.setAttribute('attributeName', 'dy');
        animate2.setAttribute('values', '0; -700');
        animate2.setAttribute('dur', '6s');
        animate2.setAttribute('repeatCount', 'indefinite');
        animate2.setAttribute('calcMode', 'linear');
        
        offset2.appendChild(animate2);
        
        // Noise 3 - Horizontal animation
        const turbulence3 = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
        turbulence3.setAttribute('type', 'turbulence');
        turbulence3.setAttribute('baseFrequency', '0.02');
        turbulence3.setAttribute('numOctaves', '10');
        turbulence3.setAttribute('result', 'noise1');
        turbulence3.setAttribute('seed', '2');
        
        const offset3 = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
        offset3.setAttribute('in', 'noise1');
        offset3.setAttribute('dx', '0');
        offset3.setAttribute('dy', '0');
        offset3.setAttribute('result', 'offsetNoise3');
        
        const animate3 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate3.setAttribute('attributeName', 'dx');
        animate3.setAttribute('values', '490; 0');
        animate3.setAttribute('dur', '6s');
        animate3.setAttribute('repeatCount', 'indefinite');
        animate3.setAttribute('calcMode', 'linear');
        
        offset3.appendChild(animate3);
        
        // Noise 4 - Horizontal animation (reverse)
        const turbulence4 = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
        turbulence4.setAttribute('type', 'turbulence');
        turbulence4.setAttribute('baseFrequency', '0.02');
        turbulence4.setAttribute('numOctaves', '10');
        turbulence4.setAttribute('result', 'noise2');
        turbulence4.setAttribute('seed', '2');
        
        const offset4 = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
        offset4.setAttribute('in', 'noise2');
        offset4.setAttribute('dx', '0');
        offset4.setAttribute('dy', '0');
        offset4.setAttribute('result', 'offsetNoise4');
        
        const animate4 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate4.setAttribute('attributeName', 'dx');
        animate4.setAttribute('values', '0; -490');
        animate4.setAttribute('dur', '6s');
        animate4.setAttribute('repeatCount', 'indefinite');
        animate4.setAttribute('calcMode', 'linear');
        
        offset4.appendChild(animate4);
        
        // Composite elements
        const composite1 = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
        composite1.setAttribute('in', 'offsetNoise1');
        composite1.setAttribute('in2', 'offsetNoise2');
        composite1.setAttribute('result', 'part1');
        
        const composite2 = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
        composite2.setAttribute('in', 'offsetNoise3');
        composite2.setAttribute('in2', 'offsetNoise4');
        composite2.setAttribute('result', 'part2');
        
        const blend = document.createElementNS('http://www.w3.org/2000/svg', 'feBlend');
        blend.setAttribute('in', 'part1');
        blend.setAttribute('in2', 'part2');
        blend.setAttribute('mode', 'color-dodge');
        blend.setAttribute('result', 'combinedNoise');
        
        const displacement = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
        displacement.setAttribute('in', 'SourceGraphic');
        displacement.setAttribute('in2', 'combinedNoise');
        displacement.setAttribute('scale', '30');
        displacement.setAttribute('xChannelSelector', 'R');
        displacement.setAttribute('yChannelSelector', 'B');
        
        // Append all elements to filter
        filter.appendChild(turbulence1);
        filter.appendChild(offset1);
        filter.appendChild(turbulence2);
        filter.appendChild(offset2);
        filter.appendChild(turbulence3);
        filter.appendChild(offset3);
        filter.appendChild(turbulence4);
        filter.appendChild(offset4);
        filter.appendChild(composite1);
        filter.appendChild(composite2);
        filter.appendChild(blend);
        filter.appendChild(displacement);
    }

    setupResizeObserver() {
        if (!window.ResizeObserver) return;
        
        this.resizeObserver = new ResizeObserver(() => {
            this.updateAnimation();
        });
        
        this.resizeObserver.observe(this.element);
    }

    updateAnimation() {
        if (!this.svgRef || !this.element) return;
        
        // Apply filter to stroke
        if (this.strokeRef) {
            this.strokeRef.style.filter = `url(#${this.filterId})`;
        }
        
        const rect = this.element.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width || 0));
        const height = Math.max(1, Math.round(rect.height || 0));
        
        // Update animation values
        const dyAnims = this.svgRef.querySelectorAll('feOffset > animate[attributeName="dy"]');
        if (dyAnims.length >= 2) {
            dyAnims[0].setAttribute('values', `${height}; 0`);
            dyAnims[1].setAttribute('values', `0; -${height}`);
        }
        
        const dxAnims = this.svgRef.querySelectorAll('feOffset > animate[attributeName="dx"]');
        if (dxAnims.length >= 2) {
            dxAnims[0].setAttribute('values', `${width}; 0`);
            dxAnims[1].setAttribute('values', `0; -${width}`);
        }
        
        // Update duration based on speed
        const baseDur = 6;
        const dur = Math.max(0.001, baseDur / (this.options.speed || 1));
        [...dyAnims, ...dxAnims].forEach(anim => {
            anim.setAttribute('dur', `${dur}s`);
        });
        
        // Update displacement scale based on chaos
        const displacement = this.svgRef.querySelector('feDisplacementMap');
        if (displacement) {
            displacement.setAttribute('scale', String(30 * (this.options.chaos || 1)));
        }
        
        // Update filter dimensions
        const filterEl = this.svgRef.querySelector(`#${CSS.escape(this.filterId)}`);
        if (filterEl) {
            filterEl.setAttribute('x', '-200%');
            filterEl.setAttribute('y', '-200%');
            filterEl.setAttribute('width', '500%');
            filterEl.setAttribute('height', '500%');
        }
        
        // Restart animations
        requestAnimationFrame(() => {
            [...dyAnims, ...dxAnims].forEach(anim => {
                if (typeof anim.beginElement === 'function') {
                    try {
                        anim.beginElement();
                    } catch (e) {
                        console.warn('ElectricBorder: beginElement failed', e);
                    }
                }
            });
        });
    }

    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.updateAnimation();
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Remove electric border classes and restore original content
        if (this.element) {
            this.element.classList.remove('electric-border');
            this.element.style.removeProperty('--electric-border-color');
            this.element.style.removeProperty('--eb-border-width');
            
            // Remove SVG and layers, keep only content
            const content = this.element.querySelector('.eb-content');
            if (content) {
                while (content.firstChild) {
                    this.element.appendChild(content.firstChild);
                }
                content.remove();
            }
            
            const svg = this.element.querySelector('.eb-svg');
            if (svg) svg.remove();
            
            const layers = this.element.querySelector('.eb-layers');
            if (layers) layers.remove();
        }
    }
}

// Utility function to easily apply ElectricBorder animation
function applyElectricBorder(selector, options = {}) {
    const elements = document.querySelectorAll(selector);
    const instances = [];
    
    elements.forEach(element => {
        const instance = new ElectricBorder(element, options);
        instances.push(instance);
    });
    
    return instances;
}

// Export for use in other scripts
window.ElectricBorder = ElectricBorder;
window.applyElectricBorder = applyElectricBorder;
