-- ====================================================================
-- Initial Seed Data: Published Emission Factors & Demo Factory
-- ====================================================================

-- Insert Published Reference Emission Factors with LCA Citations
INSERT INTO emission_factors (factor_name, category, value, unit, source_citation) VALUES
('virgin_pet', 'Scope 3 Raw Material', 2.3000, 'kg CO2e / kg', 'Franklin Associates / PlasticsEurope Cradle-to-Gate LCA'),
('rpet_pellets', 'Scope 3 Raw Material', 0.4500, 'kg CO2e / kg', 'ALPLA / Recoup Life Cycle Assessment Database'),
('diesel_fuel', 'Scope 1 Direct Fuel', 2.6800, 'kg CO2e / L', 'India CEA / IPCC Guidelines for National Greenhouse Gas Inventories'),
('grid_electricity_india', 'Scope 2 Purchased Electricity', 0.7900, 'kg CO2e / kWh', 'Central Electricity Authority (CEA) India CO2 Baseline Database v19'),
('road_freight_transport', 'Scope 3 Logistics', 0.1200, 'kg CO2e / tonne-km', 'GHG Protocol Category 4 & 9 Upstream/Downstream Freight Standards'),
('commute_low_carbon', 'Scope 3 Commute', 0.0300, 'kg CO2e / pass-km', 'Public Transit / Electric 2W GHG Protocol Average'),
('commute_private_vehicle', 'Scope 3 Commute', 0.1500, 'kg CO2e / pass-km', 'Petrol 2W / ICE 4W Mixed Commute Factor')
ON CONFLICT (factor_name) DO NOTHING;

-- Insert Benchmark Demo Factory
INSERT INTO factories (factory_id, factory_name, location, annual_production_volume, established_year) VALUES
('factory-apex-01', 'Apex Aqua PET Bottling Plant', 'Maharashtra, India', 25000000.00, 2019)
ON CONFLICT (factory_id) DO NOTHING;
