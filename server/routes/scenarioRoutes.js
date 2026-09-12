/**
 * Scenario Management API Routes
 * Saves, lists, deletes, and compares simulation scenarios in PostgreSQL
 */

const express = require('express');
const router = express.Router();
const { pool, isDbConnected } = require('../db');
const { calculateEmissions, DEFAULT_BASELINES, DEFAULT_LEVERS } = require('../engine/emissions');
const { calculateFinancials } = require('../engine/finance');

// In-Memory fallback store when PostgreSQL server is offline during initial frontend preview
const inMemoryScenarios = [];

// Seed default baseline into memory
const defaultBaseEmissions = calculateEmissions(DEFAULT_LEVERS, DEFAULT_BASELINES);
const defaultBaseFinancials = calculateFinancials(defaultBaseEmissions, defaultBaseEmissions, DEFAULT_LEVERS, DEFAULT_LEVERS);
inMemoryScenarios.push({
  scenario_id: 'baseline-001',
  factory_id: 'factory-apex-01',
  scenario_name: 'Baseline (Do Nothing / 100% Virgin)',
  is_baseline: true,
  created_by: 'System Default',
  created_at: new Date().toISOString(),
  levers: DEFAULT_LEVERS,
  results: {
    total_emissions_tonnes: defaultBaseEmissions.totalEmissionsTonnes,
    carbon_intensity_g_per_bottle: defaultBaseEmissions.carbonIntensityGramsPerBottle,
    annual_opex_inr: defaultBaseFinancials.totalAnnualOpEx,
    annual_savings_inr: 0,
    total_capex_inr: 0,
    payback_years: 0
  }
});

// GET /api/scenarios - List all saved scenarios
router.get('/', async (req, res) => {
  if (isDbConnected()) {
    try {
      const result = await pool.query(`
        SELECT s.*, r.total_emissions_tonnes, r.carbon_intensity_g_per_bottle, 
               r.annual_opex_inr, r.annual_savings_inr, r.total_capex_inr, r.payback_years
        FROM scenarios s
        LEFT JOIN scenario_results r ON s.scenario_id = r.scenario_id
        ORDER BY s.created_at DESC
      `);
      return res.json({ success: true, scenarios: result.rows, source: 'postgresql' });
    } catch (err) {
      console.error('PostgreSQL query error, falling back to memory:', err);
    }
  }
  res.json({ success: true, scenarios: inMemoryScenarios, source: 'memory_fallback' });
});

// POST /api/scenarios - Save new scenario to PostgreSQL
router.post('/', async (req, res) => {
  try {
    const { scenarioName, createdBy = 'Factory Owner', levers, baselines, results } = req.body;
    const scenarioId = 'scn-' + Date.now();
    const factoryId = 'factory-apex-01';

    if (isDbConnected()) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Insert into scenarios table
        await client.query(`
          INSERT INTO scenarios (scenario_id, factory_id, scenario_name, is_baseline, created_by)
          VALUES ($1, $2, $3, $4, $5)
        `, [scenarioId, factoryId, scenarioName, false, createdBy]);

        // 2. Insert input parameters
        for (const [key, val] of Object.entries(levers)) {
          await client.query(`
            INSERT INTO scenario_inputs (scenario_id, parameter_key, parameter_value)
            VALUES ($1, $2, $3)
          `, [scenarioId, key, val]);
        }

        // 3. Insert calculated results
        await client.query(`
          INSERT INTO scenario_results (
            scenario_id, scope1_tonnes, scope2_tonnes, scope3_resin_tonnes, scope3_commute_tonnes, 
            scope3_transport_tonnes, total_emissions_tonnes, carbon_intensity_g_per_bottle,
            virgin_pet_kg, rpet_kg, total_energy_kwh, annual_opex_inr, annual_savings_inr,
            total_capex_inr, payback_years
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          scenarioId, results.scope1Tonnes, results.scope2Tonnes, results.scope3ResinTonnes,
          results.scope3CommuteTonnes, results.scope3TransportTonnes, results.totalEmissionsTonnes,
          results.carbonIntensityGramsPerBottle, results.virginPetMassKg, results.rpetMassKg,
          results.totalEnergyKWh, results.totalAnnualOpEx, results.annualSavingsINR,
          results.totalCapExINR, results.paybackYears
        ]);

        await client.query('COMMIT');
        return res.json({ success: true, scenarioId, message: 'Scenario saved to PostgreSQL!' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // Memory store fallback
    const newScn = {
      scenario_id: scenarioId,
      factory_id: factoryId,
      scenario_name: scenarioName,
      is_baseline: false,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      levers,
      results: {
        total_emissions_tonnes: results.totalEmissionsTonnes,
        carbon_intensity_g_per_bottle: results.carbonIntensityGramsPerBottle,
        annual_opex_inr: results.totalAnnualOpEx,
        annual_savings_inr: results.annualSavingsINR,
        total_capex_inr: results.totalCapExINR,
        payback_years: results.paybackYears
      }
    };
    inMemoryScenarios.unshift(newScn);
    res.json({ success: true, scenarioId, message: 'Scenario saved (Memory Fallback)!' });
  } catch (error) {
    console.error('Error saving scenario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
