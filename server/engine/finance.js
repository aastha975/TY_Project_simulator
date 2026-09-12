/**
 * Financial & Payback Calculation Engine
 * Models OpEx, incremental CapEx, simple payback, and multi-year cumulative cash position (2025-2030)
 */

const COST_CONSTANTS = {
  ELECTRICITY_TARIFF_INR_PER_KWH: 8.00,  // Typical industrial power tariff in INR
  DIESEL_PRICE_INR_PER_LITER: 90.00,
  VIRGIN_PET_PRICE_INR_PER_KG: 110.00,    // Market standard in India
  RPET_PRICE_INR_PER_KG: 85.00,          // rPET flake/pellet cost
  COMMUTE_SHUTTLE_INR_PER_PASS_KM: 2.50
};

// Realistic MSME unit implementation costs (in INR)
const CAPEX_LOOKUP = {
  // Cost per 10% shift to renewable power (Rooftop solar amortization / open access PPA setup)
  renewableElectricityPer10Pct: 75000, 
  // Tooling / blow mold recalibration for lightweighting (per gram reduced)
  bottleLightweightingPerGram: 45000,
  // Compressor VFD / pressure regulator upgrade (per 1 bar optimized reduction)
  compressorOptimizationPerBar: 30000,
  // Servo drive modernization & machine overhaul (per 10% efficiency gain)
  machineEfficiencyPer10Pct: 120000,
  // Waste heat exchanger & ducting system
  heatRecoveryPer10Pct: 35000,
  // In-factory granulator / regrind conveyor for scrap recycling (per 20% capacity)
  scrapRecyclingPer20Pct: 40000,
  // Route planning software / GPS fleet dispatcher
  logisticsRouteOptimizationFixedCost: 25000,
  // Fleet telematics / driver eco-training program for own diesel vehicles
  fleetEfficiencyFixedCost: 15000,
  // EV / shuttle bus leasing incentive fund
  lowCarbonCommutePer10Pct: 15000
};

/**
 * Calculates annual OpEx breakdown, incremental CapEx, and multi-year cash flow
 */
function calculateFinancials(currentEmissionsResult, baselineEmissionsResult, currentLevers, baselineLevers) {
  // 1. Annual Operating Costs (Current Scenario)
  const annualElectricityCost = currentEmissionsResult.totalEnergyKWh * COST_CONSTANTS.ELECTRICITY_TARIFF_INR_PER_KWH;
  const annualDieselCost = currentEmissionsResult.effectiveDieselLiters * COST_CONSTANTS.DIESEL_PRICE_INR_PER_LITER;
  const annualVirginResinCost = currentEmissionsResult.virginPetMassKg * COST_CONSTANTS.VIRGIN_PET_PRICE_INR_PER_KG;
  const annualRpetResinCost = currentEmissionsResult.rpetMassKg * COST_CONSTANTS.RPET_PRICE_INR_PER_KG;
  
  const totalAnnualOpEx = annualElectricityCost + annualDieselCost + annualVirginResinCost + annualRpetResinCost;

  // 2. Baseline Operating Costs
  const baselineElectricityCost = baselineEmissionsResult.totalEnergyKWh * COST_CONSTANTS.ELECTRICITY_TARIFF_INR_PER_KWH;
  const baselineDieselCost = baselineEmissionsResult.effectiveDieselLiters * COST_CONSTANTS.DIESEL_PRICE_INR_PER_LITER;
  const baselineVirginResinCost = baselineEmissionsResult.virginPetMassKg * COST_CONSTANTS.VIRGIN_PET_PRICE_INR_PER_KG;
  const baselineRpetResinCost = baselineEmissionsResult.rpetMassKg * COST_CONSTANTS.RPET_PRICE_INR_PER_KG;
  
  const baselineTotalAnnualOpEx = baselineElectricityCost + baselineDieselCost + baselineVirginResinCost + baselineRpetResinCost;

  // 3. Annual Operational Savings
  const annualSavingsINR = Math.max(0, baselineTotalAnnualOpEx - totalAnnualOpEx);

  // 4. Implementation CapEx Calculation (Sum of lever changes vs baseline)
  let totalCapExINR = 0;

  // Renewable energy CapEx
  const deltaRenewable = Math.max(0, currentLevers.renewableElectricityPercent - (baselineLevers.renewableElectricityPercent || 0));
  totalCapExINR += (deltaRenewable / 10) * CAPEX_LOOKUP.renewableElectricityPer10Pct;

  // Lightweighting CapEx (tooling)
  const deltaWeight = Math.max(0, (baselineLevers.bottleWeightGrams || 20) - currentLevers.bottleWeightGrams);
  totalCapExINR += deltaWeight * CAPEX_LOOKUP.bottleLightweightingPerGram;

  // Compressor reduction CapEx
  const deltaPressure = Math.max(0, (baselineLevers.compressorPressureBar || 35) - currentLevers.compressorPressureBar);
  totalCapExINR += deltaPressure * CAPEX_LOOKUP.compressorOptimizationPerBar;

  // Machine efficiency CapEx
  const deltaMachineEff = Math.max(0, currentLevers.machineEfficiencyGainPercent - (baselineLevers.machineEfficiencyGainPercent || 0));
  totalCapExINR += (deltaMachineEff / 10) * CAPEX_LOOKUP.machineEfficiencyPer10Pct;

  // Heat recovery CapEx
  const deltaHeat = Math.max(0, currentLevers.heatRecoveryPercent - (baselineLevers.heatRecoveryPercent || 0));
  totalCapExINR += (deltaHeat / 10) * CAPEX_LOOKUP.heatRecoveryPer10Pct;

  // Scrap recycling CapEx
  const deltaScrap = Math.max(0, currentLevers.scrapRecyclingPercent - (baselineLevers.scrapRecyclingPercent || 0));
  totalCapExINR += (deltaScrap / 20) * CAPEX_LOOKUP.scrapRecyclingPer20Pct;

  // Logistics route optimization CapEx (Scope 3 freight)
  if (currentLevers.logisticsRouteOptimisationPercent > (baselineLevers.logisticsRouteOptimisationPercent || 0)) {
    totalCapExINR += CAPEX_LOOKUP.logisticsRouteOptimizationFixedCost;
  }

  // Fleet diesel efficiency CapEx (Scope 1 own vehicles/generators)
  if (currentLevers.fleetDieselEfficiencyPercent > (baselineLevers.fleetDieselEfficiencyPercent || 0)) {
    totalCapExINR += CAPEX_LOOKUP.fleetEfficiencyFixedCost;
  }

  // 5. Payback Period
  const paybackYears = annualSavingsINR > 0 ? parseFloat((totalCapExINR / annualSavingsINR).toFixed(2)) : 0;

  // 6. Multi-Year Cumulative Cash Trajectory (2025 to 2030)
  const startYear = 2025;
  const cashTrajectory = [];
  for (let year = startYear; year <= 2030; year++) {
    const yearIndex = year - startYear;
    // Year 0 = -CapEx; Year n = -CapEx + (n * AnnualSavings)
    const netCashPosition = -totalCapExINR + (yearIndex * annualSavingsINR);
    cashTrajectory.push({
      year,
      netCashPosition: Math.round(netCashPosition),
      isBreakeven: netCashPosition >= 0
    });
  }

  // 7. Cost Effectiveness Metric (₹ spent per Tonne CO2e avoided)
  const co2AvoidedTonnes = Math.max(0, baselineEmissionsResult.totalEmissionsTonnes - currentEmissionsResult.totalEmissionsTonnes);
  const costEffectivenessInrPerTonne = co2AvoidedTonnes > 0 ? Math.round(totalCapExINR / co2AvoidedTonnes) : 0;

  return {
    annualElectricityCost,
    annualDieselCost,
    annualVirginResinCost,
    annualRpetResinCost,
    totalAnnualOpEx,
    baselineTotalAnnualOpEx,
    annualSavingsINR,
    totalCapExINR,
    paybackYears,
    cashTrajectory,
    costEffectivenessInrPerTonne,
    co2AvoidedTonnes
  };
}

module.exports = {
  COST_CONSTANTS,
  CAPEX_LOOKUP,
  calculateFinancials
};
