/**
 * Main Application Orchestrator
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌍 Initializing NetZero PET Simulator...');

  // 0. Show/hide the offline-fallback badge whenever api.js switches engines
  const offlineBadge = document.getElementById('offlineModeBadge');
  window.addEventListener('netzero:backend-status', (e) => {
    if (offlineBadge) offlineBadge.style.display = e.detail.usingFallback ? 'flex' : 'none';
  });

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
  updateFactoryBaselineDisplay();

  // Require factory baseline inputs on first use so all outputs are personalized.
  if (localStorage.getItem('netzero_baseline_completed') !== 'true') {
    openBaselineSetup();
  }
});

// Authoritative slider <-> lever key mapping, shared by slider bindings and
// the optimizer preset click handler (so preset clicks correctly sync slider
// positions instead of relying on fragile id-substring guessing).
const SLIDER_LEVER_MAP = [
  { id: 'slider_rpet', key: 'rpetPercent', label: 'val_rpet' },
  { id: 'slider_weight', key: 'bottleWeightGrams', label: 'val_weight' },
  { id: 'slider_pressure', key: 'compressorPressureBar', label: 'val_pressure' },
  { id: 'slider_renewable', key: 'renewableElectricityPercent', label: 'val_renewable' },
  { id: 'slider_commute', key: 'lowCarbonCommutePercent', label: 'val_commute' },
  { id: 'slider_wastage', key: 'materialWastagePercent', label: 'val_wastage' },
  { id: 'slider_scrap', key: 'scrapRecyclingPercent', label: 'val_scrap' },
  { id: 'slider_machine_eff', key: 'machineEfficiencyGainPercent', label: 'val_machine_eff' },
  { id: 'slider_heat', key: 'heatRecoveryPercent', label: 'val_heat' },
  { id: 'slider_fleet_diesel', key: 'fleetDieselEfficiencyPercent', label: 'val_fleet_diesel' },
  { id: 'slider_logistics_route', key: 'logisticsRouteOptimisationPercent', label: 'val_logistics_route' },
  { id: 'slider_green_supplier', key: 'greenSupplierDiscountPercent', label: 'val_green_supplier' },
  { id: 'slider_water', key: 'waterRecyclingPercent', label: 'val_water' }
];

function setupSliderBindings() {
  SLIDER_LEVER_MAP.forEach(item => {
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

  document.getElementById('btnResetPlan')?.addEventListener('click', () => {
    if (!window.confirm('Reset all decarbonization sliders to the starting plan? Your company baseline will be preserved.')) return;

    window.appState.resetLevers();
    sliderMap.forEach(item => {
      const slider = document.getElementById(item.id);
      const label = document.getElementById(item.label);
      const value = window.appState.levers[item.key];
      if (slider) slider.value = value;
      if (label) label.textContent = value;
    });
    triggerCalculation();
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
  const heroNumber = document.getElementById('heroReadoutNumber');
  const heroDelta = document.getElementById('heroReadoutDelta');
  if (heroNumber && heroDelta) {
    const baselineTotal = data.baselineEmissions?.totalEmissionsTonnes || em.totalEmissionsTonnes;
    const reduction = baselineTotal > 0 ? ((baselineTotal - em.totalEmissionsTonnes) / baselineTotal) * 100 : 0;
    const isReduction = reduction >= 0;
    heroNumber.textContent = em.totalEmissionsTonnes.toLocaleString(undefined, { maximumFractionDigits: 0 });
    heroDelta.textContent = `${isReduction ? '↓' : '↑'} ${Math.abs(reduction).toFixed(1)}% vs Baseline`;
    heroDelta.className = `hero-delta ${isReduction ? 'is-reduction' : 'is-increase'}`;
  }

  // Carbon Intensity
  document.getElementById('kpiCarbonIntensity').textContent = em.carbonIntensityGramsPerBottle.toFixed(1);
  const baselineIntensity = data.baselineEmissions ? data.baselineEmissions.carbonIntensityGramsPerBottle : 103.1;
  const intensityDiffPct = ((em.carbonIntensityGramsPerBottle - baselineIntensity) / baselineIntensity) * 100;
  const diffEl = document.getElementById('kpiIntensityDiff');
  if (diffEl) {
    const isImprovement = intensityDiffPct <= 0;
    diffEl.textContent = `${isImprovement ? '↓' : '↑'} ${Math.abs(intensityDiffPct).toFixed(1)}% vs Baseline`;
    diffEl.classList.remove('text-success', 'text-danger');
    diffEl.classList.add('kpi-diff', isImprovement ? 'text-success' : 'text-danger');
  }

  // Total Emissions
  const emissionsVal = isTonnes ? em.totalEmissionsTonnes.toLocaleString(undefined, { maximumFractionDigits: 0 }) : (em.totalEmissionsTonnes * 1000).toLocaleString();
  document.getElementById('kpiTotalEmissions').textContent = emissionsVal;
  document.getElementById('unitEmissionsLabel').textContent = isTonnes ? 'Tonnes CO₂e' : 'kg CO₂e';
  document.getElementById('kpiEmissionsEquiv').textContent = `≈ ${em.carsTakenOffRoad} cars off road`;

  const baselineTotalTonnes = data.baselineEmissions ? data.baselineEmissions.totalEmissionsTonnes : em.totalEmissionsTonnes;
  const emissionsDiffPct = baselineTotalTonnes > 0 ? ((em.totalEmissionsTonnes - baselineTotalTonnes) / baselineTotalTonnes) * 100 : 0;
  const emissionsDiffEl = document.getElementById('kpiEmissionsDiff');
  if (emissionsDiffEl) {
    const isImprovement = emissionsDiffPct <= 0;
    emissionsDiffEl.textContent = `${isImprovement ? '↓' : '↑'} ${Math.abs(emissionsDiffPct).toFixed(1)}% vs Baseline`;
    emissionsDiffEl.classList.remove('text-success', 'text-danger');
    emissionsDiffEl.classList.add('kpi-diff', isImprovement ? 'text-success' : 'text-danger');
  }

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
  document.getElementById('nodeFleetStat').textContent = `${lev.logisticsRouteOptimisationPercent}% Freight / ${lev.fleetDieselEfficiencyPercent}% Fleet`;
}

async function loadOptimizerPackages() {
  const container = document.getElementById('optimizerPackagesContainer');
  if (!container) return;

  const packages = await window.NetZeroAPI.getOptimizerPackages(window.appState.baselines);
  const themeByPkgId = {
    quick_wins: 'preset-card-green',
    max_roi: 'preset-card-blue',
    deep_netzero: 'preset-card-purple'
  };

  container.innerHTML = packages.map(pkg => `
    <div class="preset-card ${themeByPkgId[pkg.id] || ''}" onclick="applyOptimizerPackage('${pkg.id}')">
      <div class="preset-title">${pkg.title}</div>
      <div class="preset-desc">${pkg.description}</div>
      <div class="preset-stats">
        <div class="preset-stat">
          <span class="preset-stat-value is-positive">-${pkg.co2ReductionPct}%</span>
          <span class="preset-stat-label">CO₂e</span>
        </div>
        <div class="preset-stat">
          <span class="preset-stat-value">${pkg.paybackYears}</span>
          <span class="preset-stat-label">Yrs Payback</span>
        </div>
        <div class="preset-stat">
          <span class="preset-stat-value">₹${(pkg.capexINR / 100000).toFixed(1)}L</span>
          <span class="preset-stat-label">CapEx</span>
        </div>
      </div>
    </div>
  `).join('');

  window._optimizerPackages = packages;
}

window.applyOptimizerPackage = function(pkgId) {
  const pkg = (window._optimizerPackages || []).find(p => p.id === pkgId);
  if (!pkg) return;

  window.appState.setLevers(pkg.levers);
  // Sync UI sliders (and their value labels) using the authoritative id<->key map
  for (const [k, v] of Object.entries(pkg.levers)) {
    const mapping = SLIDER_LEVER_MAP.find(item => item.key === k);
    if (!mapping) continue;
    const sliderEl = document.getElementById(mapping.id);
    const labelEl = document.getElementById(mapping.label);
    if (sliderEl) sliderEl.value = v;
    if (labelEl) labelEl.textContent = v;
  }
  triggerCalculation();
};

function setupModalHandlers() {
  // Baseline Modal
  const baselineModal = document.getElementById('baselineModal');
  document.getElementById('btnEditBaseline')?.addEventListener('click', () => {
    populateBaselineInputs();
    baselineModal.style.display = 'flex';
  });
  document.getElementById('btnCloseBaselineModal')?.addEventListener('click', () => { baselineModal.style.display = 'none'; });
  document.getElementById('btnCancelBaseline')?.addEventListener('click', () => { baselineModal.style.display = 'none'; });
  document.getElementById('btnSaveBaseline')?.addEventListener('click', () => {
    const formInputs = document.querySelectorAll('#baselineModal input[required]');
    if ([...formInputs].some(input => !input.reportValidity())) return;

    const baselines = {
      factoryName: document.getElementById('input_factory_name').value.trim(),
      annualProduction: parseFloat(document.getElementById('input_annual_production').value),
      dieselUsageLiters: parseFloat(document.getElementById('input_diesel_usage').value),
      employeeCount: parseInt(document.getElementById('input_employees').value),
      commuteDistanceKm: parseFloat(document.getElementById('input_commute_km').value),
      inboundTransportKm: parseFloat(document.getElementById('input_inbound_km').value),
      outboundTransportKm: parseFloat(document.getElementById('input_outbound_km').value),
      workingDays: parseInt(document.getElementById('input_working_days').value),
      baseEnergyPerBottleKWh: parseFloat(document.getElementById('input_base_energy').value)
    };

    window.appState.setBaselines(baselines);
    localStorage.setItem('netzero_baselines', JSON.stringify(window.appState.baselines));
    localStorage.setItem('netzero_baseline_completed', 'true');
    document.getElementById('factoryNameDisplay').textContent = `${window.appState.baselines.factoryName} (${(window.appState.baselines.annualProduction/1000000).toFixed(0)}M btl/yr)`;
    baselineModal.style.display = 'none';
    triggerCalculation();
  });
  document.getElementById('btnUseDemoDefaults')?.addEventListener('click', () => {
    // Demo defaults already live on window.appState.baselines (set in the
    // SimulatorState constructor) — just accept them as-is and proceed.
    localStorage.setItem('netzero_baselines', JSON.stringify(window.appState.baselines));
    localStorage.setItem('netzero_baseline_completed', 'true');
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
      document.getElementById('btnCloseCompare')?.focus();
    }
  });

  document.getElementById('btnCloseCompare')?.addEventListener('click', () => {
    document.getElementById('compareSection').style.display = 'none';
  });

  // Export B2B Carbon Passport PDF
  document.getElementById('btnExportPassport')?.addEventListener('click', () => {
    const container = document.getElementById('passportPrintContainer');
    if (container) container.innerHTML = buildPassportContent();
    window.print();
  });
}

/**
 * Builds a clean, print-safe HTML summary of the current scenario for the
 * "Supplier Carbon Passport" export. Deliberately avoids Chart.js <canvas>
 * elements (they don't print reliably) in favor of plain numbers and
 * CSS-width "bars" for the scope breakdown.
 */
function buildPassportContent() {
  const results = window.appState.currentResults;
  const baselines = window.appState.baselines;

  if (!results || !results.emissions || !results.financials) {
    return `
      <div class="passport-doc">
        <h1>Supplier Carbon Passport</h1>
        <p>No scenario data is available yet. Adjust the levers to run a calculation, then export again.</p>
      </div>
    `;
  }

  const em = results.emissions;
  const fin = results.financials;

  const scopeRows = [
    { label: 'Scope 1 (Diesel/Fuel)', tonnes: em.scope1Tonnes || 0 },
    { label: 'Scope 2 (Electricity)', tonnes: em.scope2Tonnes || 0 },
    { label: 'Scope 3 (Resin/Materials)', tonnes: em.scope3ResinTonnes || 0 },
    { label: 'Scope 3 (Commute)', tonnes: em.scope3CommuteTonnes || 0 },
    { label: 'Scope 3 (Transport)', tonnes: em.scope3TransportTonnes || 0 }
  ];
  const maxScopeTonnes = Math.max(...scopeRows.map(r => r.tonnes), 0.0001);

  // costEffectivenessInrPerTonne is only present on the server-computed
  // engine output; the offline client fallback engine doesn't calculate it,
  // so fall back to computing it here from what we do have.
  let costEffectiveness = fin.costEffectivenessInrPerTonne;
  if (costEffectiveness === undefined || costEffectiveness === null) {
    const baselineTonnes = results.baselineEmissions ? results.baselineEmissions.totalEmissionsTonnes : em.totalEmissionsTonnes;
    const co2Avoided = Math.max(0, baselineTonnes - em.totalEmissionsTonnes);
    costEffectiveness = co2Avoided > 0 ? Math.round(fin.totalCapExINR / co2Avoided) : 0;
  }

  const generatedOn = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return `
    <div class="passport-doc">
      <header class="passport-doc-header">
        <h1>Supplier Carbon Passport</h1>
        <p class="passport-doc-subtitle">${baselines.factoryName || 'Factory'}</p>
      </header>

      <table class="passport-summary-table">
        <tbody>
          <tr><th>Total Annual Emissions</th><td>${em.totalEmissionsTonnes.toLocaleString(undefined, { maximumFractionDigits: 0 })} Tonnes CO₂e</td></tr>
          <tr><th>Carbon Intensity</th><td>${em.carbonIntensityGramsPerBottle.toFixed(1)} g CO₂e / bottle</td></tr>
          <tr><th>Annual OpEx Savings</th><td>₹${(fin.annualSavingsINR / 100000).toFixed(2)} Lakh / yr</td></tr>
          <tr><th>Total CapEx Required</th><td>₹${(fin.totalCapExINR / 100000).toFixed(2)} Lakh</td></tr>
          <tr><th>Payback Period</th><td>${fin.paybackYears.toFixed(2)} years</td></tr>
          <tr><th>Cost-Effectiveness</th><td>₹${costEffectiveness.toLocaleString()} / Tonne CO₂e avoided</td></tr>
        </tbody>
      </table>

      <h2 class="passport-section-heading">Emissions by Scope</h2>
      <table class="passport-scope-table">
        <tbody>
          ${scopeRows.map(row => `
            <tr>
              <td class="passport-scope-label">${row.label}</td>
              <td class="passport-scope-bar-cell">
                <div class="passport-scope-bar" style="width: ${((row.tonnes / maxScopeTonnes) * 100).toFixed(1)}%;"></div>
              </td>
              <td class="passport-scope-value">${row.tonnes.toLocaleString(undefined, { maximumFractionDigits: 1 })} T</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <footer class="passport-doc-footer">
        Generated on ${generatedOn}
      </footer>
    </div>
  `;
}

function openBaselineSetup() {
  const baselineModal = document.getElementById('baselineModal');
  if (!baselineModal) return;

  populateBaselineInputs();
  baselineModal.classList.add('baseline-setup');
  baselineModal.style.display = 'flex';
  document.getElementById('btnCloseBaselineModal')?.setAttribute('style', 'display: none');
  document.getElementById('btnCancelBaseline')?.setAttribute('style', 'display: none');
  document.getElementById('baselineIntro').textContent =
    'Before you explore the simulator, enter your company’s current-year baseline. The simulator will use these numbers as the reference for emissions, savings, and payback.';
}

function populateBaselineInputs() {
  const baselines = window.appState.baselines;
  const fieldMap = {
    input_factory_name: baselines.factoryName,
    input_annual_production: baselines.annualProduction,
    input_diesel_usage: baselines.dieselUsageLiters,
    input_employees: baselines.employeeCount,
    input_commute_km: baselines.commuteDistanceKm,
    input_inbound_km: baselines.inboundTransportKm,
    input_outbound_km: baselines.outboundTransportKm,
    input_working_days: baselines.workingDays,
    input_base_energy: baselines.baseEnergyPerBottleKWh
  };

  Object.entries(fieldMap).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) input.value = value;
  });
}

function updateFactoryBaselineDisplay() {
  const display = document.getElementById('factoryNameDisplay');
  const baselines = window.appState.baselines;
  if (display && baselines) {
    display.textContent = `${baselines.factoryName} (${(baselines.annualProduction / 1000000).toFixed(0)}M btl/yr)`;
  }
}

async function loadCompareMatrix() {
  const savedScenarios = await window.NetZeroAPI.getScenarios();
  const currentResults = window.appState.currentResults;
  const activeScenario = currentResults ? {
    scenario_name: 'Current unsaved plan',
    is_baseline: false,
    levers: window.appState.levers,
    results: {
      total_emissions_tonnes: currentResults.emissions.totalEmissionsTonnes,
      carbon_intensity_g_per_bottle: currentResults.emissions.carbonIntensityGramsPerBottle,
      annual_savings_inr: currentResults.financials.annualSavingsINR,
      total_capex_inr: currentResults.financials.totalCapExINR,
      payback_years: currentResults.financials.paybackYears
    }
  } : null;
  const scenarios = activeScenario
    ? [activeScenario, ...savedScenarios]
    : savedScenarios;
  const table = document.getElementById('compareTable');
  const narrativeBox = document.getElementById('diffNarrative');
  if (!table) return;

  if (!scenarios.length) {
    table.innerHTML = '<tbody><tr><td class="compare-empty">Save a scenario to compare factory plans.</td></tr></tbody>';
    return;
  }

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
    const baseline = scenarios.find(s => s.is_baseline) || scenarios[scenarios.length - 1];
    const baselineEmissions = Number(baseline.results?.total_emissions_tonnes || 0);
    const scenarioEmissions = Number(scn.results?.total_emissions_tonnes || 0);
    narrativeBox.innerHTML = `
      <i class="fa-solid fa-comment-dots text-accent"></i>
      <span><strong>Plan insight:</strong> "${scn.scenario_name}" changes annual emissions by <strong>${Math.abs(Math.round(baselineEmissions - scenarioEmissions))} Tonnes CO₂e</strong> versus baseline and has a payback period of <strong>${scn.results?.payback_years || 0} years</strong>.</span>
    `;
  }
}
