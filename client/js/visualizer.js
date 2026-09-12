/**
 * Chart.js Visualizer Manager
 * Handles real-time trajectory curves, payback breakeven, and Scope breakdown donut
 */

class ChartVisualizer {
  constructor() {
    this.emissionsChart = null;
    this.cashflowChart = null;
    this.donutChart = null;
  }

  init() {
    this.initEmissionsTrajectory();
    this.initCashflowTrajectory();
    this.initScopeBar();
    this.initWaterfall();
  }

  /**
   * Custom Chart.js plugin: draws each dataset's label directly at its
   * rightmost (2030) data point, in that dataset's color, positioned just
   * outside the chart area to the right — replacing a separate legend row
   * with En-ROADS-style direct end-of-line labels.
   */
  getEndOfLineLabelsPlugin() {
    return {
      id: 'endOfLineLabels',
      afterDatasetsDraw: (chart) => {
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';

        chart.data.datasets.forEach((dataset, index) => {
          const meta = chart.getDatasetMeta(index);
          if (!meta || meta.hidden || !meta.data || !meta.data.length) return;

          const lastPoint = meta.data[meta.data.length - 1];
          if (!lastPoint) return;

          const color = dataset.borderColor || dataset.backgroundColor || '#94a3b8';
          ctx.fillStyle = typeof color === 'string' ? color : '#94a3b8';
          ctx.textAlign = 'left';
          const label = dataset.label.length > 22 ? `${dataset.label.slice(0, 21)}…` : dataset.label;
          ctx.fillText(label, chartArea.right + 8, lastPoint.y);
        });

        ctx.restore();
      }
    };
  }

  initEmissionsTrajectory() {
    const ctx = document.getElementById('chartEmissionsTrajectory')?.getContext('2d');
    if (!ctx) return;

    const areaColors = [
      ['rgba(245, 158, 11, 0.9)', '#f59e0b'],
      ['rgba(6, 182, 212, 0.88)', '#06b6d4'],
      ['rgba(16, 185, 129, 0.9)', '#10b981'],
      ['rgba(139, 92, 246, 0.88)', '#8b5cf6']
    ];

    this.emissionsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['2025', '2026', '2027', '2028', '2029', '2030'],
        datasets: [
          {
            label: 'Scope 1 · Diesel',
            data: [48, 48, 48, 48, 48, 48],
            backgroundColor: areaColors[0][0],
            borderColor: areaColors[0][1],
            borderWidth: 2,
            fill: 'origin',
            pointRadius: 0,
            tension: 0.35,
            cubicInterpolationMode: 'monotone',
            stack: 'active-emissions',
            order: 3
          },
          {
            label: 'Scope 2 · Electricity',
            data: [1284, 1284, 1284, 1284, 1284, 1284],
            backgroundColor: areaColors[1][0],
            borderColor: areaColors[1][1],
            borderWidth: 2,
            fill: 'stack',
            pointRadius: 0,
            tension: 0.35,
            cubicInterpolationMode: 'monotone',
            stack: 'active-emissions',
            order: 3
          },
          {
            label: 'Scope 3 · Resin',
            data: [1184, 1184, 1184, 1184, 1184, 1184],
            backgroundColor: areaColors[2][0],
            borderColor: areaColors[2][1],
            borderWidth: 2,
            fill: 'stack',
            pointRadius: 0,
            tension: 0.35,
            cubicInterpolationMode: 'monotone',
            stack: 'active-emissions',
            order: 3
          },
          {
            label: 'Scope 3 · Commute & freight',
            data: [60, 60, 60, 60, 60, 60],
            backgroundColor: areaColors[3][0],
            borderColor: areaColors[3][1],
            borderWidth: 2,
            fill: 'stack',
            pointRadius: 0,
            tension: 0.35,
            cubicInterpolationMode: 'monotone',
            stack: 'active-emissions',
            order: 3
          },
          {
            label: 'Baseline total',
            data: [2576, 2576, 2576, 2576, 2576, 2576],
            borderColor: 'rgba(100, 116, 139, 0.6)',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.45,
            cubicInterpolationMode: 'monotone',
            fill: false,
            pointBackgroundColor: '#0b0f19',
            pointBorderColor: '#94a3b8',
            pointBorderWidth: 1.5,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { right: 92 }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        animation: {
          duration: 900,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            boxPadding: 4,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString()} Tonnes CO₂e / yr`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { font: { size: 12 } }
          },
          y: { 
            stacked: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            title: { display: true, text: 'Tonnes CO₂e / yr', color: '#94a3b8', font: { size: 12 } },
            ticks: { font: { size: 12 } }
          }
        }
      },
      plugins: [this.getEndOfLineLabelsPlugin()]
    });
  }

  initCashflowTrajectory() {
    const ctx = document.getElementById('chartCashflow')?.getContext('2d');
    if (!ctx) return;

    this.cashflowChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['2025 (Yr 0)', '2026 (Yr 1)', '2027 (Yr 2)', '2028 (Yr 3)', '2029 (Yr 4)', '2030 (Yr 5)'],
        datasets: [
          {
            label: 'Cumulative Net Cash Position',
            data: [-5.85, 100.4, 206.7, 312.9, 419.2, 525.5],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.14)',
            borderWidth: 3.5,
            fill: true,
            pointRadius: 4.5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#0b0f19',
            pointBorderColor: '#67e8f9',
            pointBorderWidth: 2,
            tension: 0.42,
            cubicInterpolationMode: 'monotone',
            segment: {
              borderColor: (context) => context.p1.parsed.y >= 0 ? '#06b6d4' : '#f59e0b',
              backgroundColor: (context) => context.p1.parsed.y >= 0
                ? 'rgba(6, 182, 212, 0.14)'
                : 'rgba(245, 158, 11, 0.14)'
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        animation: {
          duration: 900,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Net Cash: ₹${ctx.raw.toFixed(2)} Lakh`
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          y: { 
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            title: { display: true, text: '₹ Lakh (Cumulative)', color: '#94a3b8', font: { size: 10 } }
          }
        }
      }
    });
  }

  initScopeBar() {
    const ctx = document.getElementById('chartScopeDonut')?.getContext('2d');
    if (!ctx) return;

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Scope 3 (Resin)', 'Scope 2 (Electricity)', 'Scope 3 (Commute & Freight)', 'Scope 1 (Diesel Fuel)'],
        datasets: [{
          label: 'Tonnes CO₂e',
          data: [1184, 1284, 60, 48],
          backgroundColor: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b']
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, title: { display: true, text: 'Tonnes CO₂e', color: '#94a3b8' } },
          y: { ticks: { color: '#94a3b8' } }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} t CO₂e` } }
        }
      }
    });
  }

  initWaterfall() {
    const ctx = document.getElementById('chartWaterfall')?.getContext('2d');
    if (!ctx) return;

    this.waterfallChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Resin', 'Electricity', 'Transport', 'Diesel'],
        datasets: [{
          label: 'Δ Tonnes (reduction)',
          data: [0, 0, 0, 0],
          backgroundColor: ['#10b981', '#10b981', '#10b981', '#10b981']
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          y: { ticks: { color: '#94a3b8' } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw >= 0 ? '-' : ''}${Math.abs(ctx.raw).toLocaleString()} t CO₂e`
            }
          }
        }
      }
    });
  }

  /**
   * Returns an adoption-progress fraction (0 to 1) for a given year index (0-5)
   * following a logistic (S-curve) shape: slow start, faster middle ramp,
   * leveling off toward full adoption — reflecting real phased rollout
   * (e.g. solar commissioning, retooling trial runs) rather than instant linear change.
   */
  getAdoptionProgress(yearIndex) {
    const k = 1.5;        // steepness of the S-curve
    const midpoint = 2.5; // center the inflection around year 2.5 of 0-5
    const logistic = (x) => 1 / (1 + Math.exp(-k * (x - midpoint)));
    const raw = logistic(yearIndex);
    const rawStart = logistic(0);
    const rawEnd = logistic(5);
    // Normalize so year 0 maps to exactly 0 and year 5 maps to exactly 1
    return (raw - rawStart) / (rawEnd - rawStart);
  }

  update(data, baselineData) {
    if (!data || !data.emissions || !data.financials) return;

    const baseTonnes = baselineData ? baselineData.totalEmissionsTonnes : 2576;
    const currentTonnes = data.emissions.totalEmissionsTonnes;

    // 1. Update the stacked emissions pathway from baseline to active plan.
    if (this.emissionsChart) {
      const scopeKeys = [
        'scope1Tonnes',
        'scope2Tonnes',
        'scope3ResinTonnes',
        'scope3CommuteTonnes'
      ];
      const transportValues = [
        baselineData?.scope3TransportTonnes || 0,
        data.emissions.scope3TransportTonnes || 0
      ];

      scopeKeys.forEach((key, index) => {
        const baselineValue = index === 3
          ? (baselineData?.scope3CommuteTonnes || 0) + transportValues[0]
          : (baselineData?.[key] || 0);
        const currentValue = index === 3
          ? (data.emissions.scope3CommuteTonnes || 0) + transportValues[1]
          : (data.emissions[key] || 0);
        this.emissionsChart.data.datasets[index].data = Array.from(
          { length: 6 },
          (_, yearIndex) => Math.max(0, Math.round((baselineValue + (currentValue - baselineValue) * this.getAdoptionProgress(yearIndex)) * 10) / 10)
        );
      });

      this.emissionsChart.data.datasets[4].data = Array(6).fill(Math.round(baseTonnes));
      this.emissionsChart.update();
    }

    // 2. Update Cashflow Breakeven Chart
    if (this.cashflowChart && data.financials.cashTrajectory) {
      this.cashflowChart.data.datasets[0].data = data.financials.cashTrajectory.map(c => c.netCashPosition / 100000);
      this.cashflowChart.update();
    }

    // 3. Update Scope Breakdown Bar
    if (this.barChart) {
      this.barChart.data.datasets[0].data = [
        Math.round(data.emissions.scope3ResinTonnes),
        Math.round(data.emissions.scope2Tonnes),
        Math.round(data.emissions.scope3CommuteTonnes + data.emissions.scope3TransportTonnes),
        Math.round(data.emissions.scope1Tonnes)
      ];
      this.barChart.update();
    }

    // 4. Update Waterfall (baseline -> current contribution deltas)
    if (this.waterfallChart && baselineData) {
      const resinDelta = (baselineData.scope3ResinTonnes || 0) - data.emissions.scope3ResinTonnes;
      const elecDelta = (baselineData.scope2Tonnes || 0) - data.emissions.scope2Tonnes;
      const transportDelta = ((baselineData.scope3CommuteTonnes || 0) + (baselineData.scope3TransportTonnes || 0)) - (data.emissions.scope3CommuteTonnes + data.emissions.scope3TransportTonnes);
      const dieselDelta = (baselineData.scope1Tonnes || 0) - data.emissions.scope1Tonnes;
      const deltas = [resinDelta, elecDelta, transportDelta, dieselDelta].map(d => Math.round(d * 100) / 100);
      this.waterfallChart.data.datasets[0].data = deltas;
      this.waterfallChart.data.datasets[0].backgroundColor = deltas.map(d => d >= 0 ? '#10b981' : '#f59e0b');
      this.waterfallChart.update();
    }
  }
}

window.visualizer = new ChartVisualizer();
