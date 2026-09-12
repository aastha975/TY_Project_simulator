-- ====================================================================
-- Net Zero Simulator for PET Bottle Manufacturing - Database Schema
-- Database Target: PostgreSQL 12+ (Compatible with pgAdmin 4)
-- ====================================================================

-- 1. Create Tables
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS scenario_results CASCADE;
DROP TABLE IF EXISTS scenario_inputs CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS factories CASCADE;
DROP TABLE IF EXISTS emission_factors CASCADE;

-- Reference table for published LCA constants & emission factors
CREATE TABLE emission_factors (
    factor_id SERIAL PRIMARY KEY,
    factor_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    value NUMERIC(10, 4) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    source_citation TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Factory Profile
CREATE TABLE factories (
    factory_id VARCHAR(50) PRIMARY KEY,
    factory_name VARCHAR(150) NOT NULL,
    location VARCHAR(100) NOT NULL,
    annual_production_volume NUMERIC(15, 2) NOT NULL DEFAULT 10000000.00, -- bottles/year
    established_year INT DEFAULT 2018,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scenarios (Baseline or User-Created Simulations)
CREATE TABLE scenarios (
    scenario_id VARCHAR(50) PRIMARY KEY,
    factory_id VARCHAR(50) NOT NULL REFERENCES factories(factory_id) ON DELETE CASCADE,
    scenario_name VARCHAR(150) NOT NULL,
    is_baseline BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_by VARCHAR(100) DEFAULT 'Factory Manager',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scenario Inputs (12 Levers + Baseline Variables)
CREATE TABLE scenario_inputs (
    input_id SERIAL PRIMARY KEY,
    scenario_id VARCHAR(50) NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    parameter_key VARCHAR(100) NOT NULL,
    parameter_value NUMERIC(12, 4) NOT NULL,
    unit VARCHAR(30),
    CONSTRAINT unique_scenario_parameter UNIQUE (scenario_id, parameter_key)
);

-- Calculated Simulation Results
CREATE TABLE scenario_results (
    result_id SERIAL PRIMARY KEY,
    scenario_id VARCHAR(50) NOT NULL UNIQUE REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    
    -- Emissions Breakdown (in Tonnes CO2e / year)
    scope1_tonnes NUMERIC(12, 4) NOT NULL,
    scope2_tonnes NUMERIC(12, 4) NOT NULL,
    scope3_resin_tonnes NUMERIC(12, 4) NOT NULL,
    scope3_commute_tonnes NUMERIC(12, 4) NOT NULL,
    scope3_transport_tonnes NUMERIC(12, 4) NOT NULL,
    total_emissions_tonnes NUMERIC(12, 4) NOT NULL,
    
    -- Intensity & Operational Metrics
    carbon_intensity_g_per_bottle NUMERIC(10, 2) NOT NULL,
    virgin_pet_kg NUMERIC(14, 2) NOT NULL,
    rpet_kg NUMERIC(14, 2) NOT NULL,
    total_energy_kwh NUMERIC(14, 2) NOT NULL,
    
    -- Financials & Payback (in ₹ INR)
    annual_opex_inr NUMERIC(15, 2) NOT NULL,
    annual_savings_inr NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_capex_inr NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payback_years NUMERIC(8, 2) DEFAULT 0.00,
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generated Recommendations / Optimizer Packages
CREATE TABLE recommendations (
    rec_id SERIAL PRIMARY KEY,
    scenario_id VARCHAR(50) NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    package_type VARCHAR(50) NOT NULL, -- 'Quick Wins', 'Max ROI', 'Deep Net Zero'
    recommended_levers JSONB NOT NULL,
    expected_co2_reduction_pct NUMERIC(6, 2) NOT NULL,
    expected_capex_inr NUMERIC(15, 2) NOT NULL,
    expected_payback_years NUMERIC(8, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast lookups
CREATE INDEX idx_scenarios_factory ON scenarios(factory_id);
CREATE INDEX idx_inputs_scenario ON scenario_inputs(scenario_id);
CREATE INDEX idx_results_scenario ON scenario_results(scenario_id);

-- Analytical View for pgAdmin Querying & Comparison
CREATE OR REPLACE VIEW v_scenario_comparison AS
SELECT 
    f.factory_name,
    s.scenario_name,
    s.is_baseline,
    r.total_emissions_tonnes,
    r.carbon_intensity_g_per_bottle,
    r.annual_opex_inr,
    r.annual_savings_inr,
    r.total_capex_inr,
    r.payback_years,
    r.calculated_at
FROM scenarios s
JOIN factories f ON s.factory_id = f.factory_id
JOIN scenario_results r ON s.scenario_id = r.scenario_id
ORDER BY s.created_at DESC;
