/**
 * Main Express Application Server Entry
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const calculationRoutes = require('./routes/calculationRoutes');
const scenarioRoutes = require('./routes/scenarioRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../client')));

// API Routes
app.use('/api/calculation', calculationRoutes);
app.use('/api/scenarios', scenarioRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Net Zero PET Simulator Backend',
    timestamp: new Date().toISOString()
  });
});

// Fallback to client/index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log('========================================================');
  console.log(`🚀 Net Zero Simulator Server running on http://localhost:${PORT}`);
  console.log('📂 Serving client UI from ../client/');
  console.log('========================================================');
});
