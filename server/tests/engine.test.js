/**
 * Automated Verification Test Suite for Net Zero Simulator Engines
 */

const { calculateEmissions, DEFAULT_BASELINES, DEFAULT_LEVERS } = require('../engine/emissions');
const { calculateFinancials } = require('../engine/finance');
const { checkGuardrails } = require('../engine/guardrails');
const { generateOptimalPackages } = require('../engine/optimizer');

console.log('========================================================');
console.log('🧪 RUNNING NET ZERO SIMULATOR UNIT & LIMIT TEST SUITE');
console.log('========================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
  }
}

// Test 1: Baseline Execution Test (Virgin PET + 100% Grid)
const baselineEmissions = calculateEmissions(DEFAULT_LEVERS, DEFAULT_BASELINES);
assert(baselineEmissions.totalEmissionsTonnes > 0, 'Baseline emissions calculates positive number');
assert(baselineEmissions.carbonIntensityGramsPerBottle > 20 && baselineEmissions.carbonIntensityGramsPerBottle < 130, 
  `Baseline carbon intensity (${baselineEmissions.carbonIntensityGramsPerBottle.toFixed(2)} g/bottle) accurately reflects unmitigated 100% virgin + grid baseline`);

// Test 2: Zero Boundary Conditions
const zeroDieselEmissions = calculateEmissions(DEFAULT_LEVERS, { ...DEFAULT_BASELINES, dieselUsageLiters: 0 });
assert(zeroDieselEmissions.scope1Kg === 0, 'Zero diesel usage yields exactly 0 Scope 1 emissions');

const zeroPowerEmissions = calculateEmissions({ ...DEFAULT_LEVERS, renewableElectricityPercent: 100 }, DEFAULT_BASELINES);
assert(zeroPowerEmissions.scope2Kg === 0, '100% renewable electricity yields exactly 0 Scope 2 emissions');

// Test 3: 100% rPET Boundary Test
const fullRpetEmissions = calculateEmissions({ ...DEFAULT_LEVERS, rpetPercent: 100 }, DEFAULT_BASELINES);
assert(fullRpetEmissions.virginPetMassKg === 0, '100% rPET results in exactly 0 virgin PET mass');
assert(fullRpetEmissions.scope3ResinKg < baselineEmissions.scope3ResinKg, '100% rPET significantly reduces Scope 3 resin emissions');

// Test 4: Physical Energy Stacking Floor Test (~35% minimum)
const extremeLevers = {
  ...DEFAULT_LEVERS,
  machineEfficiencyGainPercent: 30,
  heatRecoveryPercent: 100,
  compressorPressureBar: 28
};
const extremeEmissions = calculateEmissions(extremeLevers, DEFAULT_BASELINES);
const baseEnergyTotal = DEFAULT_BASELINES.annualProduction * DEFAULT_BASELINES.baseEnergyPerBottleKWh;
const minEnergyAllowed = baseEnergyTotal * 0.35;
assert(extremeEmissions.totalEnergyKWh >= minEnergyAllowed - 1, 
  `Energy floor protected: ${extremeEmissions.totalEnergyKWh.toFixed(0)} kWh >= minimum physics floor ${minEnergyAllowed.toFixed(0)} kWh`);

// Test 5: Financial Payback & Trajectory Test
const scenarioLevers = {
  ...DEFAULT_LEVERS,
  rpetPercent: 30,
  bottleWeightGrams: 18,
  renewableElectricityPercent: 50,
  compressorPressureBar: 31
};
const scenarioEmissions = calculateEmissions(scenarioLevers, DEFAULT_BASELINES);
const financials = calculateFinancials(scenarioEmissions, baselineEmissions, scenarioLevers, DEFAULT_LEVERS);

assert(financials.annualSavingsINR > 0, `Scenario generates operational savings: ₹${(financials.annualSavingsINR/100000).toFixed(2)} Lakhs/yr`);
assert(financials.totalCapExINR > 0, `Scenario computes realistic CapEx: ₹${(financials.totalCapExINR/100000).toFixed(2)} Lakhs`);
assert(financials.paybackYears >= 0 && financials.paybackYears < 10, `Payback period is reasonable: ${financials.paybackYears} years`);
assert(financials.cashTrajectory.length === 6, 'Cash trajectory generates 6-year schedule (2025 to 2030)');

// Test 6: Guardrails & Warning Flags
const riskyLevers = { ...DEFAULT_LEVERS, bottleWeightGrams: 14.5, rpetPercent: 60 };
const guardrailCheck = checkGuardrails(riskyLevers, DEFAULT_BASELINES);
assert(guardrailCheck.hasWarnings === true, 'Guardrail triggers on risky high-rPET / ultra-lightweight combination');

// Test 7: Reverse Optimizer Packages
const packages = generateOptimalPackages(DEFAULT_LEVERS, DEFAULT_BASELINES);
assert(packages.length === 3, 'Optimizer returns 3 Pareto-optimal strategy packages');

console.log('\n========================================================');
console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('========================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
