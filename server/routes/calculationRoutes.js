/**
 * Calculation API Routes
 * Instant simulation calculation, Pareto optimizer, and guardrail validation
 */

const express = require('express');
const router = express.Router();
const { calculateEmissions, DEFAULT_BASELINES, DEFAULT_LEVERS } = require('../engine/emissions');
const { calculateFinancials } = require('../engine/finance');
const { checkGuardrails } = require('../engine/guardrails');
const { generateOptimalPackages } = require('../engine/optimizer');

// POST /api/calculate - Calculate live emissions and financials
router.post('/calculate', (req, res) => {
  try {
    const { levers = {}, baselines = {} } = req.body;
    
    // Compute current scenario
    const currentEmissions = calculateEmissions(levers, baselines);
    
    // Compute baseline reference
    const baselineEmissions = calculateEmissions(DEFAULT_LEVERS, baselines);
    
    // Compute financials & payback schedule
    const financials = calculateFinancials(currentEmissions, baselineEmissions, levers, DEFAULT_LEVERS);
    
    // Check engineering guardrails
    const guardrails = checkGuardrails(levers, baselines);

    res.json({
      success: true,
      data: {
        emissions: currentEmissions,
        baselineEmissions,
        financials,
        guardrails
      }
    });
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/optimizer/packages - Get 3 Pareto-optimal preset packages
router.post('/optimizer/packages', (req, res) => {
  try {
    const { baselines = {} } = req.body;
    const packages = generateOptimalPackages(DEFAULT_LEVERS, baselines);
    res.json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
