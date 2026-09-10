/**
 * Central Reactive State Manager
 */

class SimulatorState {
  constructor() {
    this.unitMode = 'tonnes'; // 'tonnes' (Tonnes / ₹ Lakh) or 'kg' (kg / ₹)
    this.activeTheme = this.getPreferredTheme();
    
    this.baselines = {
      factoryName: 'Apex Aqua PET Bottling Plant',
      annualProduction: 25000000,
      dieselUsageLiters: 18000,
      employeeCount: 45,
      commuteDistanceKm: 12,
      workingDays: 300,
      inboundTransportKm: 180,
      outboundTransportKm: 120,
      baseEnergyPerBottleKWh: 0.065
    };

    const savedBaselines = localStorage.getItem('netzero_baselines');
    if (savedBaselines) {
      this.baselines = { ...this.baselines, ...JSON.parse(savedBaselines) };
    }

    this.defaultLevers = {
      rpetPercent: 0,
      bottleWeightGrams: 20.0,
      compressorPressureBar: 35,
      renewableElectricityPercent: 0,
      lowCarbonCommutePercent: 15,
      materialWastagePercent: 5.0,
      scrapRecyclingPercent: 40,
      machineEfficiencyGainPercent: 0,
      heatRecoveryPercent: 0,
      routeOptimisationPercent: 0,
      greenSupplierDiscountPercent: 0,
      waterRecyclingPercent: 10
    };
    this.levers = { ...this.defaultLevers };

    this.currentResults = null;
    this.savedScenarios = [];
    this.listeners = [];
    this.applyTheme();
  }

  getPreferredTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.activeTheme);
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  setLever(key, val) {
    this.levers[key] = parseFloat(val);
    this.notify();
  }

  setLevers(newLevers) {
    this.levers = { ...this.levers, ...newLevers };
    this.notify();
  }

  resetLevers() {
    this.levers = { ...this.defaultLevers };
    this.notify();
  }

  setBaselines(newBaselines) {
    this.baselines = { ...this.baselines, ...newBaselines };
    this.notify();
  }

  setUnitMode(mode) {
    this.unitMode = mode;
    this.notify();
  }

  toggleTheme() {
    this.activeTheme = this.activeTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
  }
}

window.appState = new SimulatorState();

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', event => {
    if (!localStorage.getItem('netzero_theme_override')) {
      window.appState.activeTheme = event.matches ? 'light' : 'dark';
      window.appState.applyTheme();
    }
  });
}
