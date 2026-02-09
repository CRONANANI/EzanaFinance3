/**
 * Chart Controls - type toggle, benchmark overlay, export (PNG, CSV, PDF).
 * Call ChartControls.init(chartInstance, getPortfolioDataFn) after chart is created.
 */
const ChartControls = (function () {
    let chart = null;
    let getPortfolioDataFn = null;

    function init(chartInstance, getDataFn) {
        chart = chartInstance;
        getPortfolioDataFn = getDataFn || (() => ({}));
        const container = document.getElementById('chart-controls');
        if (!container) return;

        container.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                container.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const type = this.getAttribute('data-type');
                if (window.onChartTypeChange) window.onChartTypeChange(type);
            });
        });

        container.querySelector('#chart-benchmark-sp500')?.addEventListener('change', function () {
            if (window.onBenchmarkChange) window.onBenchmarkChange('sp500', this.checked);
        });
        container.querySelector('#chart-benchmark-nasdaq')?.addEventListener('change', function () {
            if (window.onBenchmarkChange) window.onBenchmarkChange('nasdaq', this.checked);
        });

        container.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const format = this.getAttribute('data-format');
                exportChart(format);
            });
        });
    }

    function exportChart(format) {
        if (!chart) return;
        if (format === 'png') {
            const link = document.createElement('a');
            link.download = 'portfolio-chart.png';
            link.href = chart.toBase64Image('image/png');
            link.click();
        } else if (format === 'csv') {
            const data = getPortfolioDataFn();
            const labels = chart.data.labels || [];
            const values = (chart.data.datasets && chart.data.datasets[0] && chart.data.datasets[0].data) || [];
            const rows = [['Date', 'Value']];
            labels.forEach((l, i) => rows.push([l, values[i] != null ? values[i] : '']));
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const link = document.createElement('a');
            link.download = 'portfolio-data.csv';
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        } else if (format === 'pdf') {
            const img = chart.toBase64Image('image/png');
            const w = window.open('', '_blank');
            if (w) {
                w.document.write('<html><head><title>Portfolio Chart</title></head><body style="margin:0"><img src="' + img + '" style="max-width:100%;height:auto"/></body></html>');
                w.document.close();
                w.print();
                w.close();
            }
        }
    }

    return { init, exportChart };
})();
window.ChartControls = ChartControls;
