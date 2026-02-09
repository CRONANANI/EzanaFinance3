/**
 * Cursor Reveal - feed-like strip of platform UI teasers centered on the cursor.
 * Content: Investment Feed (Congress trades), Community threads, Monte Carlo preview.
 */
(function () {
    const VIEWPORT_WIDTH = 260;
    const VIEWPORT_HEIGHT = 260;
    const THROTTLE_MS = 320;
    const IDLE_MS = 1700;
    const SLIDE_COUNT = 6;

    let cursorX = 0;
    let cursorY = 0;
    let rafId = 0;
    let lastSlideAdvanceTime = 0;
    let idleTimer = null;
    let currentSlide = 0;

    function gap() {
        return '<div class="reveal-gap" aria-hidden="true"></div>';
    }

    function comp(html) {
        return '<div class="reveal-component">' + html + '</div>';
    }

    function getTeaserSlide(index) {
        const slides = [
            /* 0: Investment Feed – Congress trade (sidebar notification style) */
            comp('<div class="reveal-notification"><span class="reveal-badge congress">Congress</span><div class="reveal-notif-title">Nancy Pelosi just traded a stock</div><div class="reveal-notif-meta">2m ago</div></div>') +
            gap() +
            comp('<div class="reveal-notification"><span class="reveal-badge stocks">Stocks</span><div class="reveal-notif-title">Disclosure: NVDA purchase filed</div><div class="reveal-notif-meta">1h ago</div></div>'),

            /* 1: Community discussion thread */
            comp('<div class="reveal-community"><div class="comp-title">Community</div><div class="reveal-thread-title">Should I add more to VOO?</div><div class="reveal-thread-preview">I\'m DCAing every month but thinking of increasing...</div><div class="reveal-thread-meta">12 replies · 2h ago</div></div>'),

            /* 2: Monte Carlo simulation preview (For the Quants) */
            comp('<div class="reveal-montecarlo"><div class="comp-title"><i class="bi bi-dice-6"></i> Monte Carlo Simulation</div><div class="comp-body">Stochastic simulation for complex option pricing</div><div class="reveal-mc-steps">S₀, K, r, σ, T · N paths</div></div>') +
            gap() +
            comp('<div class="reveal-montecarlo"><div class="comp-body">Generate random paths → Geometric Brownian motion → Average payoff, discount to PV</div></div>'),

            /* 3: Another Congress-style notification */
            comp('<div class="reveal-notification"><span class="reveal-badge congress">Congress</span><div class="reveal-notif-title">Senator discloses AAPL sale</div><div class="reveal-notif-meta">5h ago</div></div>') +
            gap() +
            comp('<div class="reveal-notification"><span class="reveal-badge market_news">News</span><div class="reveal-notif-title">Fed holds rates; markets edge higher</div><div class="reveal-notif-meta">30m ago</div></div>'),

            /* 4: Community thread */
            comp('<div class="reveal-community"><div class="comp-title">Community</div><div class="reveal-thread-title">Best ETF for long-term hold?</div><div class="reveal-thread-preview">VTI vs VOO vs SCHD – what\'s your pick for 20-year...</div><div class="reveal-thread-meta">28 replies · 5h ago</div></div>'),

            /* 5: Monte Carlo steps snippet */
            comp('<div class="reveal-montecarlo"><div class="comp-title">Monte Carlo · For the Quants</div><div class="reveal-mc-steps">Initialize S₀,K,r,σ,T,N → Random paths (GBM) → Payoffs → Average & discount</div></div>')
        ];
        return slides[index % slides.length];
    }

    function createRevealDOM() {
        const layer = document.getElementById('cursor-reveal');
        if (!layer) return null;
        let viewport = layer.querySelector('.cursor-reveal-viewport');
        if (!viewport) {
            viewport = document.createElement('div');
            viewport.className = 'cursor-reveal-viewport';
            viewport.id = 'cursor-reveal-viewport';
            const content = document.createElement('div');
            content.className = 'cursor-reveal-content';
            for (let i = 0; i < SLIDE_COUNT; i++) {
                const slide = document.createElement('div');
                slide.className = 'cursor-reveal-slide' + (i === 0 ? ' active' : '');
                slide.setAttribute('data-slide', String(i));
                slide.innerHTML = getTeaserSlide(i);
                content.appendChild(slide);
            }
            viewport.appendChild(content);
            layer.appendChild(viewport);
        }
        return { layer, viewport };
    }

    function setSlide(idx) {
        const layer = document.getElementById('cursor-reveal');
        if (!layer) return;
        const slides = layer.querySelectorAll('.cursor-reveal-slide');
        slides.forEach(function (s, i) {
            s.classList.toggle('active', i === idx);
        });
        currentSlide = idx;
    }

    function advanceSlide() {
        setSlide((currentSlide + 1) % SLIDE_COUNT);
    }

    function tick() {
        rafId = requestAnimationFrame(tick);
        const viewport = document.getElementById('cursor-reveal-viewport');
        if (!viewport) return;
        var x = cursorX - VIEWPORT_WIDTH / 2;
        var y = cursorY - VIEWPORT_HEIGHT / 2;
        viewport.style.setProperty('--cursor-x', x + 'px');
        viewport.style.setProperty('--cursor-y', y + 'px');
    }

    function onMouseMove(e) {
        cursorX = e.clientX;
        cursorY = e.clientY;
        const now = Date.now();

        const layer = document.getElementById('cursor-reveal');
        if (layer) layer.classList.remove('idle');

        if (now - lastSlideAdvanceTime >= THROTTLE_MS) {
            lastSlideAdvanceTime = now;
            advanceSlide();
        }

        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        idleTimer = setTimeout(function () {
            idleTimer = null;
            const el = document.getElementById('cursor-reveal');
            if (el) el.classList.add('idle');
        }, IDLE_MS);
    }

    function init() {
        const dom = createRevealDOM();
        if (!dom) return;
        dom.layer.classList.add('idle');
        document.addEventListener('mousemove', onMouseMove, { passive: true });
        rafId = requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
