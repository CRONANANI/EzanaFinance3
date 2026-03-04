/**
 * Cursor Reveal - platform UI teasers centered on the cursor.
 * Only the Nancy Pelosi / Congress trade slide uses split (two items + gap).
 * All others are single component cards: Fed rate, portfolio alert, VaR formula, etc.
 */
(function () {
    const VIEWPORT_WIDTH = 260;
    const VIEWPORT_HEIGHT = 260;
    const MIN_MOVE_DISTANCE = 160;
    const IDLE_MS = 1700;
    const SLIDE_COUNT = 8;

    let cursorX = 0;
    let cursorY = 0;
    var lastAdvanceX = null;
    var lastAdvanceY = null;
    let rafId = 0;
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
            /* 0: SPLIT – Nancy Pelosi trade (two sidebar notifications with gap) */
            comp('<div class="reveal-notification"><span class="reveal-badge congress">Congress</span><div class="reveal-notif-title">Nancy Pelosi just traded a stock</div><div class="reveal-notif-meta">2m ago</div></div>') +
            gap() +
            comp('<div class="reveal-notification"><span class="reveal-badge stocks">Stocks</span><div class="reveal-notif-title">Disclosure: NVDA purchase filed</div><div class="reveal-notif-meta">1h ago</div></div>'),

            /* 1: SINGLE – Fed rate card (economic indicators style, rate + change graph) */
            comp('<div class="reveal-econ reveal-single"><div class="comp-title">Fed Funds Rate</div><div class="reveal-fed-main"><span class="reveal-fed-value">5.25%</span><span class="reveal-fed-change">Unchanged</span></div><div class="reveal-mini-chart"><svg viewBox="0 0 220 36" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="#10b981" stroke-width="1.2" d="M0 28 L44 26 L88 24 L132 22 L176 20 L220 18"/><path fill="rgba(16,185,129,0.12)" d="M0 28 L44 26 L88 24 L132 22 L176 20 L220 18 L220 36 L0 36 Z"/></svg></div></div>'),

            /* 2: SINGLE – Portfolio alert (sidebar notification tab, one card) */
            comp('<div class="reveal-notification reveal-single"><span class="reveal-badge portfolio">Portfolio</span><div class="reveal-notif-title">Portfolio alert: AAPL moved +2.4%</div><div class="reveal-notif-meta">Above your price target · 15m ago</div></div>'),

            /* 3: SINGLE – Value at Risk (VaR) formula card (For the Quants) */
            comp('<div class="reveal-var reveal-single"><div class="comp-title"><i class="bi bi-graph-down"></i> Value at Risk (VaR)</div><div class="comp-body">Risk measurement for portfolio management</div><div class="reveal-formula">VaR₍ₐ₎ = μ − σ × Z₍ₐ₎</div><div class="reveal-code-snippet"># Historical Simulation VaR · np.percentile(returns, 100 − conf)</div></div>'),

            /* 4: SINGLE – Community discussion thread */
            comp('<div class="reveal-community reveal-single"><div class="comp-title">Community</div><div class="reveal-thread-title">Should I add more to VOO?</div><div class="reveal-thread-preview">I\'m DCAing every month but thinking of increasing...</div><div class="reveal-thread-meta">12 replies · 2h ago</div></div>'),

            /* 5: SINGLE – Monte Carlo (For the Quants) */
            comp('<div class="reveal-montecarlo reveal-single"><div class="comp-title"><i class="bi bi-dice-6"></i> Monte Carlo Simulation</div><div class="comp-body">Stochastic simulation for complex option pricing</div><div class="reveal-mc-steps">S₀, K, r, σ, T · N paths → GBM → Payoffs → Average & discount</div></div>'),

            /* 6: SINGLE – Economic indicator: GDP growth card */
            comp('<div class="reveal-econ reveal-single"><div class="comp-title">Economic Indicators</div><div class="reveal-metric-row"><div class="reveal-metric info"><span class="reveal-metric-icon"><i class="bi bi-graph-down"></i></span><span class="reveal-metric-label">GDP Growth</span><span class="reveal-metric-value">2.8%</span><span class="reveal-metric-sub">+0.3% quarterly</span></div></div></div>'),

            /* 7: SINGLE – Housing data card */
            comp('<div class="reveal-econ reveal-single"><div class="comp-title">Housing Data</div><div class="reveal-metric-row"><div class="reveal-metric positive"><span class="reveal-metric-icon"><i class="bi bi-house"></i></span><span class="reveal-metric-label">Housing Starts</span><span class="reveal-metric-value">1.42M</span><span class="reveal-metric-sub">+5.2% MoM</span></div></div></div>')
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
        var px = e.clientX;
        var py = e.clientY;
        cursorX = px;
        cursorY = py;

        var layer = document.getElementById('cursor-reveal');
        if (layer) layer.classList.remove('idle');

        if (lastAdvanceX === null || lastAdvanceY === null) {
            lastAdvanceX = px;
            lastAdvanceY = py;
        } else {
            var dx = px - lastAdvanceX;
            var dy = py - lastAdvanceY;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= MIN_MOVE_DISTANCE) {
                lastAdvanceX = px;
                lastAdvanceY = py;
                advanceSlide();
            }
        }

        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        idleTimer = setTimeout(function () {
            idleTimer = null;
            var el = document.getElementById('cursor-reveal');
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
