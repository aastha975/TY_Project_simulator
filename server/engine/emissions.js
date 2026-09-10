/**
 * Emission Calculation Engine
 * Implements GHG Protocol Corporate Standard (Scope 1, 2, 3) for PET Bottling Plants
 */

const EMISSION_CONSTANTS = {
  VIRGIN_PET_FACTOR: 2.30,       // kg CO2e / kg (PlasticsEurope LCA)
  RPET_FACTOR: 0.45,             // kg CO2e / kg (ALPLA/Recoup LCA)
  DIESEL_FACTOR: 2.68,           // kg CO2e / L (IPCC / CEA)
  GRID_FACTOR: 0.79,             // kg CO2e / kWh (CEA India Grid Avg)
  FREIGHT_FACTOR: 0.12,          // kg CO2e / tonne-km
  COMMUTE_LOW_CARBON: 0.03,      // kg CO2e / passenger-km (Bus/Train/EV)
  COMMUTE_PRIVATE: 0.15,         // kg CO2e / passenger-km (Petrol 2W/Car)
  ENERGY_IRREDUCIBLE_FLOOR: 0.35 // 35% minimum physics limit on machine energy
};

const DEFAULT_BASELINES = {
  annualProduction: 25000000,    // 25 Million bottles/year
  dieselUsageLiters: 18000,       // L/year (backup generators & logistics)
  employeeCount: 45,
  commuteDistanceKm: 12,          // one-way km
  workingDays: 300,
  inboundTransportKm: 180,        // km from resin supplier
  outboundTransportKm: 120,       // km to distributors
  baseEnergyPerBottleKWh: 0.065   // typical 0.06 - 0.08 kWh/bottle for SBM
};

const DEFAULT_LEVERS = {
  rpetPercent: 0,                 // 0 - 100%
  bottleWeightGrams: 20,          // 14 - 22 grams
  compressorPressureBar: 35,      // 28 - 35 bar
  renewableElectricityPercent: 0, // 0 - 100%
  lowCarbonCommutePercent: 15,    // 0 - 100%
  materialWastagePercent: 5,      // 0 - 20%
  scrapRecyclingPercent: 40,      // 0 - 100%
  machineEfficiencyGainPercent: 0,// 0 - 30%
  heatRecoveryPercent: 0,         // 0 - 100%
  routeOptimisationPercent: 0,    // 0 - 25%
  greenSupplierDiscountPercent: 0,// 0 - 10%
  waterRecyclingPercent: 10       // 0 - 100% (non-carbon metric)
};

/**
 * Calculate full emissions breakdown for a given set of levers and baselines
 */
function calculateEmissions(levers = {}, baselines = {}) {
  const cfg = { ...DEFAULT_BASELINES, ...baselines };
  const lev = { ...DEFAULT_LEVERS, ...levers };

  // 1. SCOPE 1: Direct Fuel (Diesel/LPG)
  // Route optimization slightly discounts operational diesel use
  const effectiveDieselLiters = Math.max(0, cfg.dieselUsageLiters * (1 - (lev.routeOptimisationPercent / 100)));
  const scope1Kg = effectiveDieselLiters * EMISSION_CONSTANTS.DIESEL_FACTOR;

  // 2. SCOPE 2: Purchased Electricity
  // Pressure ratio modifier vs standard 35 bar
  const pressureRatio = Math.max(0.7, Math.min(1.0, lev.compressorPressureBar / 35));
  
  // Stacking efficiency discounts: machine efficiency + heat recovery
  const machineDiscount = lev.machineEfficiencyGainPercent / 100;
  const heatDiscount = (lev.heatRecoveryPercent / 100) * 0.15; // Heat recovery cuts up to 15% blow mold reheat energy
  const rawEfficiencyMultiplier = (1 - machineDiscount) * (1 - heatDiscount) * pressureRatio;
  
  // Apply Physics Energy Floor (~35% of baseline minimum)
  const effectiveEfficiencyMultiplier = Math.max(EMISSION_CONSTANTS.ENERGY_IRREDUCIBLE_FLOOR, rawEfficiencyMultiplier);
  
  const totalEnergyKWh = cfg.annualProduction * cfg.baseEnergyPerBottleKWh * effectiveEfficiencyMultiplier;
  const effectiveGridFactor = EMISSION_CONSTANTS.GRID_FACTOR * (1 - (lev.renewableElectricityPercent / 100));
  const scope2Kg = totalEnergyKWh * effectiveGridFactor;

  // 3. SCOPE 3: Raw Material / Resin Footprint
  const bottleWeightKg = lev.bottleWeightGrams / 1000;
  // Net wastage offset by in-factory regrind scrap recycling
  const netWastageRate = Math.max(0, (lev.materialWastagePercent / 100) * (1 - (lev.scrapRecyclingPercent / 100)));
  const totalPetMassKg = cfg.annualProduction * bottleWeightKg * (1 + netWastageRate);
  
  const rpetFraction = Math.min(1, Math.max(0, lev.rpetPercent / 100));
  const rpetMassKg = totalPetMassKg * rpetFraction;
  const virginPetMassKg = totalPetMassKg * (1 - rpetFraction);

  // Green supplier adoption applies up to 10% discount to virgin PET LCA
  const effectiveVirginPetFactor = EMISSION_CONSTANTS.VIRGIN_PET_FACTOR * (1 - ((lev.greenSupplierDiscountPercent || 0) / 100));
  const scope3ResinKg = (virginPetMassKg * effectiveVirginPetFactor) + (rpetMassKg * EMISSION_CONSTANTS.RPET_FACTOR);

  // 4. SCOPE 3: Employee Commuting (GHG Protocol Category 7)
  const roundtripKmPerEmployeeYear = cfg.commuteDistanceKm * 2 * cfg.workingDays;
  const lowCarbonFraction = Math.min(1, Math.max(0, lev.lowCarbonCommutePercent / 100));
  const lowCarbonEmployees = cfg.employeeCount * lowCarbonFraction;
  const privateVehicleEmployees = cfg.employeeCount * (1 - lowCarbonFraction);

  const scope3CommuteKg = (lowCarbonEmployees * roundtripKmPerEmployeeYear * EMISSION_CONSTANTS.COMMUTE_LOW_CARBON) +
                          (privateVehicleEmployees * roundtripKmPerEmployeeYear * EMISSION_CONSTANTS.COMMUTE_PRIVATE);

  // 5. SCOPE 3: Inbound & Outbound Transport (Categories 4 & 9)
  const totalShipmentTonnes = (cfg.annualProduction * bottleWeightKg) / 1000;
  const totalTransportDistanceKm = cfg.inboundTransportKm + cfg.outboundTransportKm;
  const transportEfficiencyFactor = 1 - (lev.routeOptimisationPercent / 100);
  const scope3TransportKg = totalShipmentTonnes * totalTransportDistanceKm * EMISSION_CONSTANTS.FREIGHT_FACTOR * transportEfficiencyFactor;

  // 6. TOTALS & INTENSITY
  const totalEmissionsKg = scope1Kg + scope2Kg + scope3ResinKg + scope3CommuteKg + scope3TransportKg;
  const totalEmissionsTonnes = totalEmissionsKg / 1000;
  const carbonIntensityGramsPerBottle = (totalEmissionsKg * 1000) / cfg.annualProduction;

  // Realism Insight: Extra bottles possible at same resin budget
  const baselineBottleWeightKg = (DEFAULT_LEVERS.bottleWeightGrams || 20) / 1000;
  const baselineResinBudgetKg = cfg.annualProduction * baselineBottleWeightKg;
  const potentialBottlesAtNewWeight = totalPetMassKg > 0 ? (baselineResinBudgetKg / bottleWeightKg) : cfg.annualProduction;
  const extraBottlesPossible = Math.max(0, Math.round(potentialBottlesAtNewWeight - cfg.annualProduction));

  // Equivalencies (Industry Standards)
  const carsTakenOffRoad = Math.round(totalEmissionsTonnes / 4.6); // Avg car emits 4.6 tonnes CO2e/year
  const treesOffsetRequired = Math.round(totalEmissionsTonnes * 45); // ~45 urban trees absorb 1 tonne CO2/year

  return {
    scope1Kg,
    scope1Tonnes: scope1Kg / 1000,
    scope2Kg,
    scope2Tonnes: scope2Kg / 1000,
    scope3ResinKg,
    scope3ResinTonnes: scope3ResinKg / 1000,
    scope3CommuteKg,
    scope3CommuteTonnes: scope3CommuteKg / 1000,
    scope3TransportKg,
    scope3TransportTonnes: scope3TransportKg / 1000,
    totalEmissionsKg,
    totalEmissionsTonnes,
    carbonIntensityGramsPerBottle,
    extraBottlesPossible,
    totalEnergyKWh,
    virginPetMassKg,
    rpetMassKg,
    effectiveDieselLiters,
    waterRecyclingPercent: lev.waterRecyclingPercent,
    carsTakenOffRoad,
    treesOffsetRequired
  };
}

module.exports = {
  EMISSION_CONSTANTS,
  DEFAULT_BASELINES,
  DEFAULT_LEVERS,
  calculateEmissions
};
