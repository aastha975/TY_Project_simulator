/**
 * Central Reactive State Manager
 */

class SimulatorState {
  constructor() {
    this.unitMode = 'tonnes'; // 'tonnes' (Tonnes / ₹ Lakh) or 'kg' (kg / ₹)
    this.activeTheme = 'dark';
    
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

    this.levers = {
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

    this.currentResults = null;
    this.savedScenarios = [];
    this.listeners = [];
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
    document.documentElement.setAttribute('data-theme', this.activeTheme);
  }
}

window.appState = new SimulatorState();
