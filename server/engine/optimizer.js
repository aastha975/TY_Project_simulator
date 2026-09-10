/**
 * Reverse Goal-Seeker & Strategy Optimizer
 * Generates 3 Pareto-optimal decarbonization packages based on factory priorities
 */

const { calculateEmissions } = require('./emissions');
const { calculateFinancials } = require('./finance');

function generateOptimalPackages(baselineLevers, baselineConfig) {
  const baseEmissions = calculateEmissions(baselineLevers, baselineConfig);

  // Package 1: Quick Wins (Zero/Low CapEx)
  const quickWinsLevers = {
    ...baselineLevers,
    compressorPressureBar: 30, // reduce from 35 to 30 bar
    scrapRecyclingPercent: 75, // boost in-house regrind
    routeOptimisationPercent: 20, // logistics route planning
    materialWastagePercent: 3
  };
  const quickWinsEmissions = calculateEmissions(quickWinsLevers, baselineConfig);
  const quickWinsFinance = calculateFinancials(quickWinsEmissions, baseEmissions, quickWinsLevers, baselineLevers);

  // Package 2: Max ROI / Fastest Payback (Solar + Moderate Lightweighting)
  const maxRoiLevers = {
    ...baselineLevers,
    bottleWeightGrams: 17.5,
    renewableElectricityPercent: 60,
    compressorPressureBar: 30,
    rpetPercent: 25,
    machineEfficiencyGainPercent: 15
  };
  const maxRoiEmissions = calculateEmissions(maxRoiLevers, baselineConfig);
  const maxRoiFinance = calculateFinancials(maxRoiEmissions, baseEmissions, maxRoiLevers, baselineLevers);

  // Package 3: Deep Net Zero (FMCG Supplier Leader)
  const deepNetZeroLevers = {
    ...baselineLevers,
    rpetPercent: 70,
    renewableElectricityPercent: 100,
    bottleWeightGrams: 16.0,
    compressorPressureBar: 29,
    heatRecoveryPercent: 80,
    machineEfficiencyGainPercent: 25,
    lowCarbonCommutePercent: 60
  };
  const deepEmissions = calculateEmissions(deepNetZeroLevers, baselineConfig);
  const deepFinance = calculateFinancials(deepEmissions, baseEmissions, deepNetZeroLevers, baselineLevers);

  return [
    {
      id: 'quick_wins',
      title: '🟢 Quick Wins (Low CapEx)',
      description: 'Optimize air pressure, scrap regrind, and dispatch logistics with minimal upfront investment.',
      levers: quickWinsLevers,
      co2ReductionPct: parseFloat((((baseEmissions.totalEmissionsTonnes - quickWinsEmissions.totalEmissionsTonnes) / baseEmissions.totalEmissionsTonnes) * 100).toFixed(1)),
      capexINR: quickWinsFinance.totalCapExINR,
      annualSavingsINR: quickWinsFinance.annualSavingsINR,
      paybackYears: quickWinsFinance.paybackYears,
      carbonIntensity: quickWinsEmissions.carbonIntensityGramsPerBottle
    },
    {
      id: 'max_roi',
      title: '🔵 Max ROI / Best Payback',
      description: 'Balanced recipe: 60% Solar power transition, 17.5g lightweighting, and 25% rPET blend.',
      levers: maxRoiLevers,
      co2ReductionPct: parseFloat((((baseEmissions.totalEmissionsTonnes - maxRoiEmissions.totalEmissionsTonnes) / baseEmissions.totalEmissionsTonnes) * 100).toFixed(1)),
      capexINR: maxRoiFinance.totalCapExINR,
      annualSavingsINR: maxRoiFinance.annualSavingsINR,
      paybackYears: maxRoiFinance.paybackYears,
      carbonIntensity: maxRoiEmissions.carbonIntensityGramsPerBottle
    },
    {
      id: 'deep_netzero',
      title: '🟣 Deep Decarbonization (BRSR Ready)',
      description: 'Aggressive 70% rPET, 100% renewable power, and heat recovery to win premium corporate beverage contracts.',
      levers: deepNetZeroLevers,
      co2ReductionPct: parseFloat((((baseEmissions.totalEmissionsTonnes - deepEmissions.totalEmissionsTonnes) / baseEmissions.totalEmissionsTonnes) * 100).toFixed(1)),
      capexINR: deepFinance.totalCapExINR,
      annualSavingsINR: deepFinance.annualSavingsINR,
      paybackYears: deepFinance.paybackYears,
      carbonIntensity: deepEmissions.carbonIntensityGramsPerBottle
    }
  ];
}

module.exports = {
  generateOptimalPackages
};
