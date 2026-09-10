/**
 * Engineering Quality & Operational Guardrails Engine
 * Validates manufacturing feasibility and prevents physical failure modes
 */

function checkGuardrails(levers = {}, baselines = {}) {
  const warnings = [];
  const recommendations = [];

  // 1. Lightweighting Check (< 16 grams)
  if (levers.bottleWeightGrams < 16) {
    warnings.push({
      severity: 'warning',
      category: 'Structural Strength',
      message: `Bottle weight is set to ${levers.bottleWeightGrams}g. Verify top-load strength to prevent bottle collapse on automated high-speed filling lines.`
    });
  }

  // 2. High rPET Blend Check (> 50%)
  if (levers.rpetPercent >= 50) {
    warnings.push({
      severity: 'info',
      category: 'Thermal & Optical Quality',
      message: `At ${levers.rpetPercent}% rPET, preform dehumidifying dryer temperature must be strictly controlled to prevent Intrinsic Viscosity (IV) loss and preform hazing.`
    });
  }

  // 3. Compressor Pressure (< 29 bar)
  if (levers.compressorPressureBar < 29) {
    warnings.push({
      severity: 'warning',
      category: 'Blow Molding Definition',
      message: `Air pressure at ${levers.compressorPressureBar} bar may cause incomplete bottle petaloid base formation at high cavity speeds.`
    });
  }

  // 4. Heavy Stacking (rPET > 50% AND Weight < 16g)
  if (levers.rpetPercent > 50 && levers.bottleWeightGrams < 16) {
    warnings.push({
      severity: 'critical',
      category: 'High Reject Risk',
      message: 'Combining high rPET (>50%) with ultra-lightweighting (<16g) increases mold defect rate by ~2-3% without upgraded machine stretch-rod servos.'
    });
  }

  // 5. Input Anomaly Sanity Check
  if (baselines.annualProduction > 20000000 && baselines.dieselUsageLiters < 2000) {
    warnings.push({
      severity: 'info',
      category: 'Input Sanity Flag',
      message: 'Diesel fuel consumption appears unusually low for an annual production over 20M bottles. Confirm if factory has uninterrupted grid line.'
    });
  }

  return {
    hasWarnings: warnings.length > 0,
    warningsCount: warnings.length,
    warnings
  };
}

module.exports = {
  checkGuardrails
};
