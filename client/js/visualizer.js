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
    this.initScopeDonut();
  }

  initEmissionsTrajectory() {
    const ctx = document.getElementById('chartEmissionsTrajectory')?.getContext('2d');
    if (!ctx) return;

    this.emissionsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['2025', '2026', '2027', '2028', '2029', '2030'],
        datasets: [
          {
            label: 'Baseline (Do Nothing)',
            data: [2576, 2576, 2576, 2576, 2576, 2576],
            borderColor: '#64748b',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            tension: 0.1
          },
          {
            label: 'Active Decarbonization Plan',
            data: [2576, 2300, 2050, 1850, 1700, 1600],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            borderWidth: 3,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString()} Tonnes CO₂e`
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          y: { 
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            title: { display: true, text: 'Tonnes CO₂e / yr', color: '#94a3b8', font: { size: 10 } }
          }
        }
      }
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
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderWidth: 3,
            fill: true,
            pointRadius: 5,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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

  initScopeDonut() {
    const ctx = document.getElementById('chartScopeDonut')?.getContext('2d');
    if (!ctx) return;

    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Scope 1 (Diesel Fuel)', 'Scope 2 (Electricity)', 'Scope 3 (Resin Material)', 'Scope 3 (Commute & Freight)'],
        datasets: [{
          data: [48, 1284, 1184, 60],
          backgroundColor: ['#f59e0b', '#06b6d4', '#10b981', '#8b5cf6'],
          borderWidth: 2,
          borderColor: '#111827'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { 
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 10 }, color: '#94a3b8' }
          }
        }
      }
    });
  }

  update(data, baselineData) {
    if (!data || !data.emissions || !data.financials) return;

    const baseTonnes = baselineData ? baselineData.totalEmissionsTonnes : 2576;
    const currentTonnes = data.emissions.totalEmissionsTonnes;

    // 1. Update Trajectory Chart (smooth transition from 2025 to 2030)
    if (this.emissionsChart) {
      this.emissionsChart.data.datasets[0].data = [baseTonnes, baseTonnes, baseTonnes, baseTonnes, baseTonnes, baseTonnes];
      
      const step = (baseTonnes - currentTonnes) / 5;
      this.emissionsChart.data.datasets[1].data = [
        Math.round(baseTonnes),
        Math.round(baseTonnes - (step * 1)),
        Math.round(baseTonnes - (step * 2)),
        Math.round(baseTonnes - (step * 3)),
        Math.round(baseTonnes - (step * 4)),
        Math.round(currentTonnes)
      ];
      this.emissionsChart.update();
    }

    // 2. Update Cashflow Breakeven Chart
    if (this.cashflowChart && data.financials.cashTrajectory) {
      this.cashflowChart.data.datasets[0].data = data.financials.cashTrajectory.map(c => c.netCashPosition / 100000);
      this.cashflowChart.update();
    }

    // 3. Update Scope Donut Chart
    if (this.donutChart) {
      this.donutChart.data.datasets[0].data = [
        Math.round(data.emissions.scope1Tonnes),
        Math.round(data.emissions.scope2Tonnes),
        Math.round(data.emissions.scope3ResinTonnes),
        Math.round(data.emissions.scope3CommuteTonnes + data.emissions.scope3TransportTonnes)
      ];
      this.donutChart.update();
    }
  }
}

window.visualizer = new ChartVisualizer();
