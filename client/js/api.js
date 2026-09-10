/**
 * API Client Module
 * Communicates with the Express Backend & PostgreSQL database.
 * Includes seamless local calculation fallback for offline / static preview.
 */

const API_BASE_URL = '/api';

const NetZeroAPI = {
  // Check backend server status
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  // Calculate live simulation results
  async calculate(levers, baselines) {
    try {
      const res = await fetch(`${API_BASE_URL}/calculation/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levers, baselines })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch (err) {
      console.warn('Backend API unavailable. Using in-browser client calculation engine.');
    }
    // Client-side fallback calculation
    return NetZeroAPI.localCalculate(levers, baselines);
  },

  // Get optimizer packages
  async getOptimizerPackages(baselines) {
    try {
      const res = await fetch(`${API_BASE_URL}/calculation/optimizer/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baselines })
      });
      if (res.ok) {
        const json = await res.json();
        return json.packages;
      }
    } catch (err) {
      console.warn('Using local optimizer presets fallback.');
    }
    return NetZeroAPI.localOptimizerPackages(baselines);
  },

  // List saved scenarios from PostgreSQL
  async getScenarios() {
    try {
      const res = await fetch(`${API_BASE_URL}/scenarios`);
      if (res.ok) {
        const json = await res.json();
        return json.scenarios;
      }
    } catch (err) {
      console.warn('Using local scenarios store.');
    }
    return JSON.parse(localStorage.getItem('saved_scenarios') || '[]');
  },

  // Save new scenario
  async saveScenario(scenarioData) {
    try {
      const res = await fetch(`${API_BASE_URL}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenarioData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Saving scenario to LocalStorage fallback.');
    }
    const saved = JSON.parse(localStorage.getItem('saved_scenarios') || '[]');
    const newRecord = {
      scenario_id: 'scn-' + Date.now(),
      factory_id: 'factory-apex-01',
      scenario_name: scenarioData.scenarioName,
      is_baseline: false,
      created_by: scenarioData.createdBy,
      created_at: new Date().toISOString(),
      levers: scenarioData.levers,
      results: scenarioData.results
    };
    saved.unshift(newRecord);
    localStorage.setItem('saved_scenarios', JSON.stringify(saved));
    return { success: true, scenarioId: newRecord.scenario_id, message: 'Saved to Local Storage!' };
  },

  // Local fallback calculation engine (mirrors server/engine)
  localCalculate(levers, baselines) {
    const cfg = {
      annualProduction: 25000000,
      dieselUsageLiters: 18000,
      employeeCount: 45,
      commuteDistanceKm: 12,
      workingDays: 300,
      inboundTransportKm: 180,
      outboundTransportKm: 120,
      baseEnergyPerBottleKWh: 0.065,
      ...baselines
    };

    const lev = {
      rpetPercent: 0,
      bottleWeightGrams: 20,
      compressorPressureBar: 35,
      renewableElectricityPercent: 0,
      lowCarbonCommutePercent: 15,
      materialWastagePercent: 5,
      scrapRecyclingPercent: 40,
      machineEfficiencyGainPercent: 0,
      heatRecoveryPercent: 0,
      routeOptimisationPercent: 0,
      greenSupplierDiscountPercent: 0,
      waterRecyclingPercent: 10,
      ...levers
    };

    // Scope 1
    const effectiveDiesel = Math.max(0, cfg.dieselUsageLiters * (1 - (lev.routeOptimisationPercent / 100)));
    const scope1Kg = effectiveDiesel * 2.68;

    // Scope 2 (with 35% irreducible energy floor)
    const pressureRatio = Math.max(0.7, Math.min(1.0, lev.compressorPressureBar / 35));
    const rawEff = (1 - (lev.machineEfficiencyGainPercent / 100)) * (1 - (lev.heatRecoveryPercent / 100 * 0.15)) * pressureRatio;
    const effectiveEff = Math.max(0.35, rawEff);
    const totalEnergyKWh = cfg.annualProduction * cfg.baseEnergyPerBottleKWh * effectiveEff;
    const scope2Kg = totalEnergyKWh * (0.79 * (1 - (lev.renewableElectricityPercent / 100)));

    // Scope 3 Resin
    const bottleWeightKg = lev.bottleWeightGrams / 1000;
    const netWastage = Math.max(0, (lev.materialWastagePercent / 100) * (1 - (lev.scrapRecyclingPercent / 100)));
    const totalPetMassKg = cfg.annualProduction * bottleWeightKg * (1 + netWastage);
    const rpetMassKg = totalPetMassKg * (lev.rpetPercent / 100);
    const virginPetMassKg = totalPetMassKg * (1 - (lev.rpetPercent / 100));
    const scope3ResinKg = (virginPetMassKg * (2.30 * (1 - (lev.greenSupplierDiscountPercent / 100)))) + (rpetMassKg * 0.45);

    // Scope 3 Commute & Transport
    const roundtripKm = cfg.commuteDistanceKm * 2 * cfg.workingDays;
    const scope3CommuteKg = (cfg.employeeCount * (lev.lowCarbonCommutePercent / 100) * roundtripKm * 0.03) +
                            (cfg.employeeCount * (1 - (lev.lowCarbonCommutePercent / 100)) * roundtripKm * 0.15);
    const shipmentTonnes = (cfg.annualProduction * bottleWeightKg) / 1000;
    const scope3TransportKg = shipmentTonnes * (cfg.inboundTransportKm + cfg.outboundTransportKm) * 0.12 * (1 - (lev.routeOptimisationPercent / 100));

    const totalEmissionsKg = scope1Kg + scope2Kg + scope3ResinKg + scope3CommuteKg + scope3TransportKg;
    const totalEmissionsTonnes = totalEmissionsKg / 1000;
    const carbonIntensityGramsPerBottle = (totalEmissionsKg * 1000) / cfg.annualProduction;

    // Financials
    const annualOpEx = (totalEnergyKWh * 8.00) + (effectiveDiesel * 90.00) + (virginPetMassKg * 110.00) + (rpetMassKg * 85.00);
    
    // Baseline for savings calculation
    const baseEnergy = cfg.annualProduction * cfg.baseEnergyPerBottleKWh;
    const baseResinKg = cfg.annualProduction * 0.02 * 1.03;
    const baseOpEx = (baseEnergy * 8.00) + (cfg.dieselUsageLiters * 90.00) + (baseResinKg * 110.00);
    const annualSavingsINR = Math.max(0, baseOpEx - annualOpEx);

    // CapEx
    let totalCapExINR = 0;
    totalCapExINR += (lev.renewableElectricityPercent / 10) * 75000;
    totalCapExINR += Math.max(0, 20 - lev.bottleWeightGrams) * 45000;
    totalCapExINR += Math.max(0, 35 - lev.compressorPressureBar) * 30000;
    totalCapExINR += (lev.machineEfficiencyGainPercent / 10) * 120000;
    totalCapExINR += (lev.heatRecoveryPercent / 10) * 35000;
    totalCapExINR += (lev.scrapRecyclingPercent / 20) * 40000;
    if (lev.routeOptimisationPercent > 0) totalCapExINR += 25000;

    const paybackYears = annualSavingsINR > 0 ? parseFloat((totalCapExINR / annualSavingsINR).toFixed(2)) : 0;

    // Cash Trajectory
    const cashTrajectory = [];
    for (let yr = 2025; yr <= 2030; yr++) {
      const idx = yr - 2025;
      cashTrajectory.push({
        year: yr,
        netCashPosition: Math.round(-totalCapExINR + (idx * annualSavingsINR))
      });
    }

    return {
      emissions: {
        scope1Tonnes: scope1Kg / 1000,
        scope2Tonnes: scope2Kg / 1000,
        scope3ResinTonnes: scope3ResinKg / 1000,
        scope3CommuteTonnes: scope3CommuteKg / 1000,
        scope3TransportTonnes: scope3TransportKg / 1000,
        totalEmissionsTonnes,
        carbonIntensityGramsPerBottle,
        totalEnergyKWh,
        virginPetMassKg,
        rpetMassKg,
        effectiveDieselLiters: effectiveDiesel,
        carsTakenOffRoad: Math.round(totalEmissionsTonnes / 4.6)
      },
      baselineEmissions: {
        totalEmissionsTonnes: 2576.49,
        carbonIntensityGramsPerBottle: 103.06
      },
      financials: {
        totalAnnualOpEx: annualOpEx,
        annualSavingsINR,
        totalCapExINR,
        paybackYears,
        cashTrajectory
      },
      guardrails: {
        hasWarnings: lev.bottleWeightGrams < 16 || lev.rpetPercent >= 50,
        warnings: [
          ...(lev.bottleWeightGrams < 16 ? [{ severity: 'warning', category: 'Lightweighting', message: `Bottle weight (${lev.bottleWeightGrams}g) may reduce top-load strength on high speed filling.` }] : []),
          ...(lev.rpetPercent >= 50 ? [{ severity: 'info', category: 'Thermal/rPET', message: `At ${lev.rpetPercent}% rPET, verify dryer dew point to prevent preform hazing and IV drop.` }] : [])
        ]
      }
    };
  },

  localOptimizerPackages(baselines) {
    return [
      {
        id: 'quick_wins',
        title: '🟢 Quick Wins (Low CapEx)',
        description: 'Reduce pressure to 30 bar, increase scrap regrind to 75%, and optimize transport routes.',
        levers: { compressorPressureBar: 30, scrapRecyclingPercent: 75, routeOptimisationPercent: 20 },
        co2ReductionPct: 12.4,
        capexINR: 175000,
        annualSavingsINR: 3200000,
        paybackYears: 0.05
      },
      {
        id: 'max_roi',
        title: '🔵 Max ROI / Best Payback',
        description: '60% Solar power transition, 17.5g lightweighting, and 25% rPET blend.',
        levers: { bottleWeightGrams: 17.5, renewableElectricityPercent: 60, rpetPercent: 25, compressorPressureBar: 30 },
        co2ReductionPct: 38.6,
        capexINR: 675000,
        annualSavingsINR: 9850000,
        paybackYears: 0.07
      },
      {
        id: 'deep_netzero',
        title: '🟣 Deep Decarbonization (BRSR Ready)',
        description: '70% rPET, 100% renewable power, 16.0g lightweighting, and heat recovery.',
        levers: { rpetPercent: 70, renewableElectricityPercent: 100, bottleWeightGrams: 16.0, compressorPressureBar: 29, heatRecoveryPercent: 80 },
        co2ReductionPct: 62.4,
        capexINR: 1380000,
        annualSavingsINR: 14500000,
        paybackYears: 0.10
      }
    ];
  }
};

window.NetZeroAPI = NetZeroAPI;
