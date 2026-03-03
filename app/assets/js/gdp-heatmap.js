/**
 * World GDP Heatmap - Interactive map with country labels, GDP on hover, color-coded by GDP size
 */
(function() {
  const GDP_DATA = {
    'USA': { gdp: 17419, growth: 2.39, production: null, interest: 1.77, inflation: 1.62, budget: -4.92, debt: 96.14, current: -2.24 },
    'China': { gdp: 10355, growth: 7.27, production: 7.3, interest: 4.71, inflation: 2, budget: null, debt: null, current: null },
    'Japan': { gdp: 4601, growth: -0.1, production: null, interest: -10.73, inflation: 2.75, budget: null, debt: null, current: 0.52 },
    'Germany': { gdp: 3868, growth: 1.6, production: 1.76, interest: null, inflation: 0.91, budget: null, debt: null, current: 7.51 },
    'UK': { gdp: 2989, growth: 2.94, production: 2.9, interest: -1.19, inflation: 1.46, budget: null, debt: null, current: -5.82 },
    'France': { gdp: 2847, growth: 1.0, production: 0.9, interest: null, inflation: 0.5, budget: null, debt: null, current: -1.2 },
    'India': { gdp: 2049, growth: 7.5, production: 5.2, interest: 6.25, inflation: 5.9, budget: null, debt: null, current: -1.3 },
    'Italy': { gdp: 2141, growth: 0.8, production: 1.0, interest: null, inflation: 0.2, budget: null, debt: null, current: 2.6 },
    'Brazil': { gdp: 2353, growth: 0.1, production: -2.5, interest: 14.25, inflation: 10.67, budget: null, debt: null, current: -3.3 },
    'Canada': { gdp: 1785, growth: 2.5, production: null, interest: 0.5, inflation: 1.1, budget: null, debt: null, current: -2.9 },
    'South Korea': { gdp: 1377, growth: 3.3, production: 4.2, interest: 1.5, inflation: 0.7, budget: null, debt: null, current: 7.7 },
    'Spain': { gdp: 1406, growth: 3.2, production: 3.4, interest: null, inflation: -0.5, budget: null, debt: null, current: 1.4 },
    'Australia': { gdp: 1454, growth: 2.5, production: null, interest: 2.0, inflation: 1.5, budget: null, debt: null, current: -2.7 },
    'Mexico': { gdp: 1144, growth: 2.5, production: 3.5, interest: 3.0, inflation: 2.13, budget: null, debt: null, current: -1.8 },
    'Indonesia': { gdp: 888, growth: 5.0, production: 4.7, interest: 5.75, inflation: 3.35, budget: null, debt: null, current: -2.8 }
  };

  const COUNTRIES = [
    { name: 'USA', x: 150, y: 150, width: 200, height: 100, label: 'United States' },
    { name: 'China', x: 700, y: 180, width: 150, height: 100, label: 'China' },
    { name: 'Japan', x: 850, y: 170, width: 50, height: 40, label: 'Japan' },
    { name: 'Germany', x: 500, y: 140, width: 50, height: 50, label: 'Germany' },
    { name: 'United Kingdom', x: 450, y: 130, width: 40, height: 40, label: 'UK' },
    { name: 'Brazil', x: 300, y: 320, width: 80, height: 100, label: 'Brazil' },
    { name: 'India', x: 680, y: 220, width: 70, height: 80, label: 'India' },
    { name: 'Canada', x: 150, y: 80, width: 250, height: 60, label: 'Canada' },
    { name: 'Australia', x: 800, y: 350, width: 100, height: 60, label: 'Australia' }
  ];

  function getColor(gdp) {
    if (gdp > 10000) return '#10b981';
    if (gdp > 5000) return '#3b82f6';
    if (gdp > 2000) return '#f59e0b';
    if (gdp > 1000) return '#ef4444';
    return '#6b7280';
  }

  function drawMap() {
    const svg = document.getElementById('gdpHeatmapSvg');
    const tooltip = document.getElementById('gdpTooltip');
    if (!svg || !tooltip) return;

    svg.innerHTML = '';
    const svgNS = 'http://www.w3.org/2000/svg';

    COUNTRIES.forEach(function(country) {
      const key = country.name === 'United Kingdom' ? 'UK' : country.name;
      const data = GDP_DATA[key];
      if (!data) return;

      const color = getColor(data.gdp);

      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', country.x);
      rect.setAttribute('y', country.y);
      rect.setAttribute('width', country.width);
      rect.setAttribute('height', country.height);
      rect.setAttribute('fill', color);
      rect.setAttribute('fill-opacity', '0.6');
      rect.setAttribute('stroke', color);
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('rx', '4');
      rect.setAttribute('data-country', country.name === 'United Kingdom' ? 'UK' : country.name);
      rect.style.cursor = 'pointer';
      rect.style.transition = 'all 0.3s ease';

      rect.addEventListener('mouseenter', function(e) {
        rect.setAttribute('fill-opacity', '0.9');
        rect.setAttribute('stroke-width', '3');
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 10) + 'px';
        tooltip.style.top = (e.clientY + 10) + 'px';
        tooltip.innerHTML = '<div class="gdp-tooltip-name">' + country.label + '</div>' +
          '<div class="gdp-tooltip-row">GDP: $' + data.gdp.toLocaleString() + 'B</div>' +
          '<div class="gdp-tooltip-row ' + (data.growth >= 0 ? 'positive' : 'negative') + '">Growth: ' + (data.growth >= 0 ? '+' : '') + data.growth + '%</div>';
      });

      rect.addEventListener('mousemove', function(e) {
        tooltip.style.left = (e.clientX + 10) + 'px';
        tooltip.style.top = (e.clientY + 10) + 'px';
      });

      rect.addEventListener('mouseleave', function() {
        rect.setAttribute('fill-opacity', '0.6');
        rect.setAttribute('stroke-width', '2');
        tooltip.style.display = 'none';
      });

      rect.addEventListener('click', function() {
        const countryCode = country.name === 'United Kingdom' ? 'UK' : country.name;
        if (window.marketAnalysis && typeof window.marketAnalysis.selectCountry === 'function') {
          window.marketAnalysis.selectCountry(countryCode);
        }
      });

      svg.appendChild(rect);

      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', country.x + country.width / 2);
      text.setAttribute('y', country.y + country.height / 2 - 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', 'white');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('pointer-events', 'none');
      text.textContent = country.label;
      svg.appendChild(text);

      const gdpText = document.createElementNS(svgNS, 'text');
      gdpText.setAttribute('x', country.x + country.width / 2);
      gdpText.setAttribute('y', country.y + country.height / 2 + 12);
      gdpText.setAttribute('text-anchor', 'middle');
      gdpText.setAttribute('dominant-baseline', 'middle');
      gdpText.setAttribute('fill', 'rgba(255,255,255,0.9)');
      gdpText.setAttribute('font-size', '10');
      gdpText.setAttribute('pointer-events', 'none');
      gdpText.textContent = (data.gdp / 1000).toFixed(1) + 'T';
      svg.appendChild(gdpText);
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
    drawMap();
    initBadges();
  });

  window.GDPHeatmap = { drawMap: drawMap };
})();
