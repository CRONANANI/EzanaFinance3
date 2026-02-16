/**
 * Asset Allocation Pie Chart with Interactive Sectors
 */

class AssetAllocationChart {
  constructor() {
    this.svg = document.getElementById('allocationPieChart');
    this.tooltip = document.getElementById('sectorTooltip');
    this.legendContainer = document.getElementById('allocationLegend');

    if (!this.svg || !this.tooltip || !this.legendContainer) return;

    this.width = 400;
    this.height = 400;
    this.radius = 140;
    this.innerRadius = 70;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.activeSector = null;

    this.sectors = [
      {
        name: 'Technology',
        value: 47450,
        percentage: 29.95,
        color: '#3b82f6',
        holdings: [
          { symbol: 'NVDA', name: 'NVIDIA Corp', value: 12840, weight: 8.1 },
          { symbol: 'AAPL', name: 'Apple Inc', value: 11250, weight: 7.1 },
          { symbol: 'MSFT', name: 'Microsoft Corp', value: 9870, weight: 6.2 },
          { symbol: 'GOOGL', name: 'Alphabet Inc', value: 7340, weight: 4.6 },
          { symbol: 'META', name: 'Meta Platforms', value: 6150, weight: 3.9 }
        ]
      },
      {
        name: 'Healthcare',
        value: 31684,
        percentage: 20.00,
        color: '#10b981',
        holdings: [
          { symbol: 'UNH', name: 'UnitedHealth Group', value: 8920, weight: 5.6 },
          { symbol: 'JNJ', name: 'Johnson & Johnson', value: 7450, weight: 4.7 },
          { symbol: 'LLY', name: 'Eli Lilly', value: 6340, weight: 4.0 },
          { symbol: 'ABBV', name: 'AbbVie Inc', value: 5120, weight: 3.2 },
          { symbol: 'MRK', name: 'Merck & Co', value: 3854, weight: 2.4 }
        ]
      },
      {
        name: 'Financials',
        value: 23763,
        percentage: 15.00,
        color: '#f59e0b',
        holdings: [
          { symbol: 'BRK.B', name: 'Berkshire Hathaway', value: 6840, weight: 4.3 },
          { symbol: 'JPM', name: 'JPMorgan Chase', value: 5920, weight: 3.7 },
          { symbol: 'V', name: 'Visa Inc', value: 4780, weight: 3.0 },
          { symbol: 'MA', name: 'Mastercard', value: 3890, weight: 2.5 },
          { symbol: 'BAC', name: 'Bank of America', value: 2333, weight: 1.5 }
        ]
      },
      {
        name: 'Consumer',
        value: 19052,
        percentage: 12.02,
        color: '#8b5cf6',
        holdings: [
          { symbol: 'AMZN', name: 'Amazon.com', value: 5840, weight: 3.7 },
          { symbol: 'TSLA', name: 'Tesla Inc', value: 4230, weight: 2.7 },
          { symbol: 'HD', name: 'Home Depot', value: 3450, weight: 2.2 },
          { symbol: 'NKE', name: 'Nike Inc', value: 2890, weight: 1.8 },
          { symbol: 'MCD', name: "McDonald's Corp", value: 2642, weight: 1.7 }
        ]
      },
      {
        name: 'Industrials',
        value: 15842,
        percentage: 10.00,
        color: '#ec4899',
        holdings: [
          { symbol: 'BA', name: 'Boeing Company', value: 4230, weight: 2.7 },
          { symbol: 'CAT', name: 'Caterpillar Inc', value: 3450, weight: 2.2 },
          { symbol: 'GE', name: 'General Electric', value: 2890, weight: 1.8 },
          { symbol: 'UPS', name: 'United Parcel Service', value: 2670, weight: 1.7 },
          { symbol: 'HON', name: 'Honeywell Intl', value: 2602, weight: 1.6 }
        ]
      },
      {
        name: 'Energy',
        value: 11089,
        percentage: 7.00,
        color: '#14b8a6',
        holdings: [
          { symbol: 'XOM', name: 'Exxon Mobil', value: 3340, weight: 2.1 },
          { symbol: 'CVX', name: 'Chevron Corp', value: 2890, weight: 1.8 },
          { symbol: 'COP', name: 'ConocoPhillips', value: 2120, weight: 1.3 },
          { symbol: 'SLB', name: 'Schlumberger', value: 1560, weight: 1.0 },
          { symbol: 'EOG', name: 'EOG Resources', value: 1179, weight: 0.7 }
        ]
      },
      {
        name: 'Real Estate',
        value: 9505,
        percentage: 6.00,
        color: '#f97316',
        holdings: [
          { symbol: 'PLD', name: 'Prologis Inc', value: 2340, weight: 1.5 },
          { symbol: 'AMT', name: 'American Tower', value: 2120, weight: 1.3 },
          { symbol: 'SPG', name: 'Simon Property Group', value: 1890, weight: 1.2 },
          { symbol: 'EQIX', name: 'Equinix Inc', value: 1670, weight: 1.1 },
          { symbol: 'PSA', name: 'Public Storage', value: 1485, weight: 0.9 }
        ]
      }
    ];

    this.init();
  }

  init() {
    this.renderPieChart();
    this.renderLegend();
    this.attachEventListeners();
  }

  renderPieChart() {
    this.svg.innerHTML = '';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    this.svg.appendChild(defs);

    let currentAngle = -90;

    this.sectors.forEach((sector, index) => {
      const sliceAngle = (sector.percentage / 100) * 360;

      const gradient = this.createGradient(sector.color, 'gradient-' + index);
      defs.appendChild(gradient);

      const slice = this.createSlice(
        currentAngle,
        currentAngle + sliceAngle,
        this.innerRadius,
        this.radius,
        sector,
        index
      );

      this.svg.appendChild(slice);

      currentAngle += sliceAngle;
    });
  }

  createGradient(color, id) {
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    gradient.setAttribute('id', id);

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', this.lightenColor(color, 20));

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', color);

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);

    return gradient;
  }

  createSlice(startAngle, endAngle, innerRadius, outerRadius, sector, index) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const outerStart = this.polarToCartesian(this.centerX, this.centerY, outerRadius, startAngle);
    const outerEnd = this.polarToCartesian(this.centerX, this.centerY, outerRadius, endAngle);
    const innerStart = this.polarToCartesian(this.centerX, this.centerY, innerRadius, endAngle);
    const innerEnd = this.polarToCartesian(this.centerX, this.centerY, innerRadius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    const d = [
      'M', outerStart.x, outerStart.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
      'L', innerStart.x, innerStart.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerEnd.x, innerEnd.y,
      'Z'
    ].join(' ');

    path.setAttribute('d', d);
    path.setAttribute('fill', 'url(#' + 'gradient-' + index + ')');
    path.setAttribute('stroke', 'var(--background, #0f1419)');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('class', 'pie-slice');
    path.setAttribute('data-sector-index', index);

    return path;
  }

  polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }

  renderLegend() {
    this.legendContainer.innerHTML = '';

    this.sectors.forEach((sector, index) => {
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.dataset.sectorIndex = index;

      legendItem.innerHTML = '<div class="legend-color" style="background:' + sector.color + '"></div><div class="legend-text"><div class="legend-label">' + sector.name + '</div><div class="legend-percentage">' + sector.percentage + '%</div></div>';

      this.legendContainer.appendChild(legendItem);
    });
  }

  attachEventListeners() {
    const slices = this.svg.querySelectorAll('.pie-slice');
    slices.forEach(function(slice) {
      slice.addEventListener('mouseenter', function(e) {
        const index = parseInt(e.target.dataset.sectorIndex);
        this.showSectorTooltip(index);
      }.bind(this));
      slice.addEventListener('mouseleave', this.hideSectorTooltip.bind(this));
    }, this);

    const legendItems = this.legendContainer.querySelectorAll('.legend-item');
    legendItems.forEach(function(item) {
      item.addEventListener('mouseenter', function(e) {
        const index = parseInt(e.currentTarget.dataset.sectorIndex);
        this.highlightSector(index);
      }.bind(this));
      item.addEventListener('mouseleave', this.unhighlightSector.bind(this));
      item.addEventListener('click', function(e) {
        const index = parseInt(e.currentTarget.dataset.sectorIndex);
        this.showSectorTooltip(index);
      }.bind(this));
    }, this);
  }

  showSectorTooltip(index) {
    const sector = this.sectors[index];
    this.activeSector = index;

    const slices = this.svg.querySelectorAll('.pie-slice');
    slices.forEach(function(slice, i) {
      slice.classList.toggle('active', i === index);
    });

    const legendItems = this.legendContainer.querySelectorAll('.legend-item');
    legendItems.forEach(function(item, i) {
      item.classList.toggle('active', i === index);
    });

    this.tooltip.querySelector('.sector-name').textContent = sector.name;
    this.tooltip.querySelector('.sector-percentage').textContent = sector.percentage + '%';
    this.tooltip.querySelector('.sector-value').textContent = '$' + sector.value.toLocaleString();

    const holdingsList = this.tooltip.querySelector('.holdings-list');
    holdingsList.innerHTML = '';

    sector.holdings.forEach(function(holding) {
      const holdingItem = document.createElement('div');
      holdingItem.className = 'holding-item';
      holdingItem.innerHTML = '<div class="holding-info"><div class="holding-symbol">' + holding.symbol + '</div><div class="holding-name">' + holding.name + '</div></div><div class="holding-stats"><div class="holding-value">$' + holding.value.toLocaleString() + '</div><div class="holding-weight">' + holding.weight + '%</div></div>';
      holdingsList.appendChild(holdingItem);
    });

    this.tooltip.classList.add('active');
  }

  hideSectorTooltip() {
    this.activeSector = null;

    const slices = this.svg.querySelectorAll('.pie-slice');
    slices.forEach(function(slice) {
      slice.classList.remove('active');
    });

    const legendItems = this.legendContainer.querySelectorAll('.legend-item');
    legendItems.forEach(function(item) {
      item.classList.remove('active');
    });

    this.tooltip.classList.remove('active');
  }

  highlightSector(index) {
    const slices = this.svg.querySelectorAll('.pie-slice');
    slices[index].classList.add('active');
    const legendItems = this.legendContainer.querySelectorAll('.legend-item');
    legendItems[index].classList.add('active');
  }

  unhighlightSector() {
    if (this.activeSector === null) {
      const slices = this.svg.querySelectorAll('.pie-slice');
      slices.forEach(function(slice) {
        slice.classList.remove('active');
      });
      const legendItems = this.legendContainer.querySelectorAll('.legend-item');
      legendItems.forEach(function(item) {
        item.classList.remove('active');
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  window.assetAllocationChart = new AssetAllocationChart();
});
