/**
 * Main Application Orchestrator
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌍 Initializing NetZero PET Simulator...');
  
  // 1. Initialize Visualizer Charts
  window.visualizer.init();

  // 2. Setup Event Listeners for Sliders
  setupSliderBindings();

  // 3. Setup Process Twin Clicking
  setupProcessTwinNavigation();

  // 4. Setup Modals & Buttons
  setupModalHandlers();

  // 5. Load Optimizer Presets
  await loadOptimizerPackages();

  // 6. Initial Calculation Run
  triggerCalculation();
});

function setupSliderBindings() {
  const sliderMap = [
    { id: 'slider_rpet', key: 'rpetPercent', label: 'val_rpet' },
    { id: 'slider_weight', key: 'bottleWeightGrams', label: 'val_weight' },
    { id: 'slider_pressure', key: 'compressorPressureBar', label: 'val_pressure' },
    { id: 'slider_renewable', key: 'renewableElectricityPercent', label: 'val_renewable' },
    { id: 'slider_commute', key: 'lowCarbonCommutePercent', label: 'val_commute' },
    { id: 'slider_wastage', key: 'materialWastagePercent', label: 'val_wastage' },
    { id: 'slider_scrap', key: 'scrapRecyclingPercent', label: 'val_scrap' },
    { id: 'slider_machine_eff', key: 'machineEfficiencyGainPercent', label: 'val_machine_eff' },
    { id: 'slider_heat', key: 'heatRecoveryPercent', label: 'val_heat' },
    { id: 'slider_route', key: 'routeOptimisationPercent', label: 'val_route' },
    { id: 'slider_green_supplier', key: 'greenSupplierDiscountPercent', label: 'val_green_supplier' },
    { id: 'slider_water', key: 'waterRecyclingPercent', label: 'val_water' }
  ];

  sliderMap.forEach(item => {
    const el = document.getElementById(item.id);
    const labelEl = document.getElementById(item.label);
    if (el) {
      el.addEventListener('input', (e) => {
        const val = e.target.value;
        if (labelEl) labelEl.textContent = val;
        window.appState.setLever(item.key, val);
        triggerCalculation();
      });
    }
  });

  // Secondary Levers Accordion Toggle
  const btnToggleSecondary = document.getElementById('btnToggleSecondary');
  const secondaryContent = document.getElementById('secondaryLeversContent');
  if (btnToggleSecondary && secondaryContent) {
    btnToggleSecondary.addEventListener('click', () => {
      btnToggleSecondary.classList.toggle('open');
      secondaryContent.classList.toggle('open');
    });
  }

  // Unit Mode Toggles
  document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      window.appState.setUnitMode(e.target.dataset.unit);
      renderKPIs(window.appState.currentResults);
    });
  });

  // Theme Toggle
  document.getElementById('btnToggleTheme')?.addEventListener('click', () => {
    window.appState.toggleTheme();
  });
}

function setupProcessTwinNavigation() {
  document.querySelectorAll('.process-node').forEach(node => {
    node.addEventListener('click', () => {
      const targetId = node.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.style.outline = '2px solid #10b981';
        setTimeout(() => { targetEl.style.outline = 'none'; }, 1200);
      }
    });
  });
}

async function triggerCalculation() {
  const data = await window.NetZeroAPI.calculate(window.appState.levers, window.appState.baselines);
  window.appState.currentResults = data;

  // 1. Render Bento KPIs
  renderKPIs(data);

  // 2. Render Guardrail Alerts
  window.renderGuardrails(data.guardrails);

  // 3. Update Visualizer Charts
  window.visualizer.update(data, data.baselineEmissions);

  // 4. Update Twin Process Bar Stats
  updateProcessTwinStats();
}

function renderKPIs(data) {
  if (!data || !data.emissions || !data.financials) return;
  const em = data.emissions;
  const fin = data.financials;
  const isTonnes = window.appState.unitMode === 'tonnes';

  // Carbon Intensity
  document.getElementById('kpiCarbonIntensity').textContent = em.carbonIntensityGramsPerBottle.toFixed(1);
  const baselineIntensity = data.baselineEmissions ? data.baselineEmissions.carbonIntensityGramsPerBottle : 103.1;
  const intensityDiffPct = ((em.carbonIntensityGramsPerBottle - baselineIntensity) / baselineIntensity) * 100;
  const diffEl = document.getElementById('kpiIntensityDiff');
  if (diffEl) {
    diffEl.textContent = `${intensityDiffPct.toFixed(1)}% vs Baseline`;
    diffEl.className = intensityDiffPct <= 0 ? 'kpi-diff text-success' : 'kpi-diff text-danger';
  }

  // Total Emissions
  const emissionsVal = isTonnes ? em.totalEmissionsTonnes.toLocaleString(undefined, { maximumFractionDigits: 0 }) : (em.totalEmissionsTonnes * 1000).toLocaleString();
  document.getElementById('kpiTotalEmissions').textContent = emissionsVal;
  document.getElementById('unitEmissionsLabel').textContent = isTonnes ? 'Tonnes CO₂e' : 'kg CO₂e';
  document.getElementById('kpiEmissionsEquiv').textContent = `≈ ${em.carsTakenOffRoad} cars off road`;

  // Savings & OpEx
  const savingsVal = isTonnes ? (fin.annualSavingsINR / 100000).toFixed(2) : fin.annualSavingsINR.toLocaleString();
  document.getElementById('kpiAnnualSavings').textContent = `₹${savingsVal}`;
  document.getElementById('unitSavingsLabel').textContent = isTonnes ? 'Lakh / yr' : 'INR / yr';
  document.getElementById('kpiOpexTotal').textContent = `Annual OpEx: ₹${(fin.totalAnnualOpEx / 10000000).toFixed(2)} Cr`;

  // Payback & CapEx
  document.getElementById('kpiPaybackYears').textContent = fin.paybackYears.toFixed(2);
  document.getElementById('kpiCapExTotal').textContent = `Net CapEx: ₹${(fin.totalCapExINR / 100000).toFixed(2)} Lakh`;

  // Resin Stretch Stat
  const resinBanner = document.getElementById('resinStretchText');
  if (resinBanner) {
    if (em.extraBottlesPossible > 0) {
      resinBanner.innerHTML = `💡 <strong>Resin Stretch Insight:</strong> At ${window.appState.levers.bottleWeightGrams}g, current resin mass could produce <strong>+${em.extraBottlesPossible.toLocaleString()} additional bottles</strong> if demand allows.`;
    } else {
      resinBanner.textContent = `At this bottle weight (${window.appState.levers.bottleWeightGrams}g), production capacity matches standard baseline.`;
    }
  }
}

function updateProcessTwinStats() {
  const lev = window.appState.levers;
  document.getElementById('nodeResinStat').textContent = `${lev.rpetPercent}% rPET (${100 - lev.rpetPercent}% Virgin)`;
  document.getElementById('nodeWeightStat').textContent = `${lev.bottleWeightGrams}g Weight`;
  document.getElementById('nodePressureStat').textContent = `${lev.compressorPressureBar} bar Air`;
  document.getElementById('nodePowerStat').textContent = `${lev.renewableElectricityPercent}% Renewable`;
  document.getElementById('nodeFleetStat').textContent = `${lev.routeOptimisationPercent}% Route Opt`;
}

async function loadOptimizerPackages() {
  const container = document.getElementById('optimizerPackagesContainer');
  if (!container) return;

  const packages = await window.NetZeroAPI.getOptimizerPackages(window.appState.baselines);
  container.innerHTML = packages.map(pkg => `
    <div class="preset-card" onclick="applyOptimizerPackage('${pkg.id}')">
      <div class="preset-title">${pkg.title}</div>
      <div class="preset-desc">${pkg.description}</div>
      <div class="preset-metrics">
        <span class="preset-tag-green">-${pkg.co2ReductionPct}% CO₂e</span>
        <span>CapEx: ₹${(pkg.capexINR / 100000).toFixed(2)}L</span>
        <span>Payback: ${pkg.paybackYears} yrs</span>
      </div>
    </div>
  `).join('');

  window._optimizerPackages = packages;
}

window.applyOptimizerPackage = function(pkgId) {
  const pkg = (window._optimizerPackages || []).find(p => p.id === pkgId);
  if (!pkg) return;

  window.appState.setLevers(pkg.levers);
  // Sync UI Sliders
  for (const [k, v] of Object.entries(pkg.levers)) {
    const sliderId = k.replace('Percent', '').replace('Grams', '').replace('Bar', '').toLowerCase();
    const el = document.querySelector(`[id*="${sliderId}"]`);
    if (el) el.value = v;
  }
  triggerCalculation();
};

function setupModalHandlers() {
  // Baseline Modal
  const baselineModal = document.getElementById('baselineModal');
  document.getElementById('btnEditBaseline')?.addEventListener('click', () => { baselineModal.style.display = 'flex'; });
  document.getElementById('btnCloseBaselineModal')?.addEventListener('click', () => { baselineModal.style.display = 'none'; });
  document.getElementById('btnCancelBaseline')?.addEventListener('click', () => { baselineModal.style.display = 'none'; });
  document.getElementById('btnSaveBaseline')?.addEventListener('click', () => {
    window.appState.setBaselines({
      factoryName: document.getElementById('input_factory_name').value,
      annualProduction: parseFloat(document.getElementById('input_annual_production').value),
      dieselUsageLiters: parseFloat(document.getElementById('input_diesel_usage').value),
      employeeCount: parseInt(document.getElementById('input_employees').value),
      commuteDistanceKm: parseFloat(document.getElementById('input_commute_km').value),
      inboundTransportKm: parseFloat(document.getElementById('input_inbound_km').value),
      outboundTransportKm: parseFloat(document.getElementById('input_outbound_km').value)
    });
    document.getElementById('factoryNameDisplay').textContent = `${window.appState.baselines.factoryName} (${(window.appState.baselines.annualProduction/1000000).toFixed(0)}M btl/yr)`;
    baselineModal.style.display = 'none';
    triggerCalculation();
  });

  // Save Scenario Modal
  const saveModal = document.getElementById('saveScenarioModal');
  document.getElementById('btnSaveScenario')?.addEventListener('click', () => { saveModal.style.display = 'flex'; });
  document.getElementById('btnCloseSaveModal')?.addEventListener('click', () => { saveModal.style.display = 'none'; });
  document.getElementById('btnCancelSave')?.addEventListener('click', () => { saveModal.style.display = 'none'; });
  document.getElementById('btnConfirmSaveScenario')?.addEventListener('click', async () => {
    const name = document.getElementById('input_scenario_name').value || `Scenario ${Date.now()}`;
    const author = document.getElementById('input_created_by').value || 'Factory Manager';

    const savePayload = {
      scenarioName: name,
      createdBy: author,
      levers: window.appState.levers,
      baselines: window.appState.baselines,
      results: {
        ...window.appState.currentResults.emissions,
        ...window.appState.currentResults.financials
      }
    };

    const res = await window.NetZeroAPI.saveScenario(savePayload);
    alert(res.message || 'Scenario saved successfully!');
    saveModal.style.display = 'none';
  });

  // Compare Scenarios Button
  document.getElementById('btnCompareScenarios')?.addEventListener('click', async () => {
    const compareSection = document.getElementById('compareSection');
    compareSection.style.display = compareSection.style.display === 'none' ? 'block' : 'none';
    if (compareSection.style.display === 'block') {
      await loadCompareMatrix();
    }
  });

  document.getElementById('btnCloseCompare')?.addEventListener('click', () => {
    document.getElementById('compareSection').style.display = 'none';
  });

  // Export B2B Carbon Passport PDF
  document.getElementById('btnExportPassport')?.addEventListener('click', () => {
    window.print();
  });
}

async function loadCompareMatrix() {
  const scenarios = await window.NetZeroAPI.getScenarios();
  const table = document.getElementById('compareTable');
  const narrativeBox = document.getElementById('diffNarrative');
  if (!table) return;

  table.innerHTML = `
    <thead>
      <tr>
        <th>Scenario Name</th>
        <th>rPET %</th>
        <th>Weight</th>
        <th>Solar %</th>
        <th>Emissions</th>
        <th>Carbon Intensity</th>
        <th>Annual Savings</th>
        <th>CapEx</th>
        <th>Payback</th>
      </tr>
    </thead>
    <tbody>
      ${scenarios.map(s => `
        <tr>
          <td><strong>${s.scenario_name}</strong> ${s.is_baseline ? '<span class="badge-tag">Baseline</span>' : ''}</td>
          <td>${s.levers ? s.levers.rpetPercent : 0}%</td>
          <td>${s.levers ? s.levers.bottleWeightGrams : 20}g</td>
          <td>${s.levers ? s.levers.renewableElectricityPercent : 0}%</td>
          <td>${s.results ? Math.round(s.results.total_emissions_tonnes) : 2576} T</td>
          <td><strong>${s.results ? parseFloat(s.results.carbon_intensity_g_per_bottle).toFixed(1) : 103.1}</strong> g/btl</td>
          <td class="text-success">₹${s.results ? (s.results.annual_savings_inr / 100000).toFixed(2) : '0.00'}L</td>
          <td>₹${s.results ? (s.results.total_capex_inr / 100000).toFixed(2) : '0.00'}L</td>
          <td>${s.results ? s.results.payback_years : '0.0'} yrs</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  if (narrativeBox && scenarios.length > 1) {
    const scn = scenarios[0];
    narrativeBox.innerHTML = `
      <i class="fa-solid fa-comment-dots text-accent"></i>
      <span><strong>Automated Scenario Diff:</strong> "${scn.scenario_name}" reduces total emissions by <strong>${Math.round(2576 - (scn.results?.total_emissions_tonnes || 2000))} Tonnes CO₂e</strong> at a rapid payback period of <strong>${scn.results?.payback_years || 0.1} years</strong>.</span>
    `;
  }
}
