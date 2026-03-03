/**
 * World GDP Heatmap - Real geographical map with data dots, GDP on hover
 */
(function() {
  const GDP_DATA = {
    'USA': { gdp: 17419, growth: 2.39, label: 'United States' },
    'China': { gdp: 10355, growth: 7.27, label: 'China' },
    'Japan': { gdp: 4601, growth: -0.1, label: 'Japan' },
    'Germany': { gdp: 3868, growth: 1.6, label: 'Germany' },
    'UK': { gdp: 2989, growth: 2.94, label: 'United Kingdom' },
    'France': { gdp: 2847, growth: 1.0, label: 'France' },
    'India': { gdp: 2049, growth: 7.5, label: 'India' },
    'Brazil': { gdp: 2353, growth: 0.1, label: 'Brazil' },
    'Canada': { gdp: 1785, growth: 2.5, label: 'Canada' },
    'Australia': { gdp: 1454, growth: 2.5, label: 'Australia' },
    'Mexico': { gdp: 1144, growth: 2.5, label: 'Mexico' },
    'Indonesia': { gdp: 888, growth: 5.0, label: 'Indonesia' }
  };

  // Data dot positions (percentage: left, top) - scattered across real geographic regions
  const DOT_POSITIONS = [
    { left: 18, top: 38, country: 'USA' },
    { left: 22, top: 35, country: 'USA' },
    { left: 15, top: 42, country: 'USA' },
    { left: 25, top: 32, country: 'USA' },
    { left: 12, top: 28, country: 'Canada' },
    { left: 18, top: 25, country: 'Canada' },
    { left: 28, top: 45, country: 'Mexico' },
    { left: 32, top: 55, country: 'Brazil' },
    { left: 35, top: 48, country: 'Brazil' },
    { left: 38, top: 62, country: 'Brazil' },
    { left: 48, top: 28, country: 'UK' },
    { left: 50, top: 30, country: 'Germany' },
    { left: 52, top: 32, country: 'Germany' },
    { left: 48, top: 35, country: 'France' },
    { left: 55, top: 38, country: 'France' },
    { left: 72, top: 42, country: 'India' },
    { left: 76, top: 38, country: 'China' },
    { left: 78, top: 42, country: 'China' },
    { left: 82, top: 36, country: 'China' },
    { left: 86, top: 34, country: 'Japan' },
    { left: 88, top: 36, country: 'Japan' },
    { left: 72, top: 58, country: 'Indonesia' },
    { left: 84, top: 68, country: 'Australia' },
    { left: 88, top: 72, country: 'Australia' },
    { left: 52, top: 52, country: null },
    { left: 58, top: 48, country: null },
    { left: 62, top: 55, country: null },
    { left: 68, top: 32, country: null },
    { left: 42, top: 58, country: null }
  ];

  function drawDots() {
    const container = document.getElementById('gdpMapDots');
    const tooltip = document.getElementById('gdpTooltip');
    if (!container || !tooltip) return;

    container.innerHTML = '';
    DOT_POSITIONS.forEach(function(dot) {
      const el = document.createElement('div');
      el.className = 'gdp-dot';
      el.style.left = dot.left + '%';
      el.style.top = dot.top + '%';
      if (dot.country) {
        el.dataset.country = dot.country;
        el.classList.add('gdp-dot-clickable');
        const data = GDP_DATA[dot.country];
        if (data) {
          el.addEventListener('mouseenter', function(e) {
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 12) + 'px';
            tooltip.style.top = (e.clientY + 12) + 'px';
            tooltip.innerHTML = '<div class="gdp-tooltip-name">' + data.label + '</div>' +
              '<div class="gdp-tooltip-row">GDP: $' + data.gdp.toLocaleString() + 'B</div>' +
              '<div class="gdp-tooltip-row ' + (data.growth >= 0 ? 'positive' : 'negative') + '">Growth: ' + (data.growth >= 0 ? '+' : '') + data.growth + '%</div>';
          });
          el.addEventListener('mousemove', function(e) {
            tooltip.style.left = (e.clientX + 12) + 'px';
            tooltip.style.top = (e.clientY + 12) + 'px';
          });
          el.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
          });
          el.addEventListener('click', function() {
            if (window.marketAnalysis && typeof window.marketAnalysis.selectCountry === 'function') {
              window.marketAnalysis.selectCountry(dot.country);
            }
          });
        }
      }
      container.appendChild(el);
    });
  }

  function initBadges() {
    document.querySelectorAll('.gdp-badge[data-country]').forEach(function(badge) {
      badge.style.cursor = 'pointer';
      badge.addEventListener('click', function() {
        const country = badge.dataset.country;
        if (window.marketAnalysis && typeof window.marketAnalysis.selectCountry === 'function') {
          window.marketAnalysis.selectCountry(country);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    drawDots();
    initBadges();
  });

  window.GDPHeatmap = { drawDots: drawDots };
})();
