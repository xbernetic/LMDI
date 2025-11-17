import * as XLSX from 'xlsx';

export interface LMDIConfig {
  startYear: number;
  endYear: number;
  sheetName?: string;
  epsilon?: number;
}

export interface LMDIResult {
  config: LMDIConfig;
  summary: {
    totalChange: number;
    productionEffect: number;
    economicStructureEffect: number;
    energyIntensityEffect: number;
    fuelMixEffect: number;
    emissionFactorEffect: number;
  };
  decompositions: Array<{
    period: string;
    totalChange: number;
    productionEffect: number;
    economicStructureEffect: number;
    energyIntensityEffect: number;
    fuelMixEffect: number;
    emissionFactorEffect: number;
    sumOfEffects: number;
    difference: number;
  }>;
  yearlyResults: Array<{
    period: string;
    production: number;
    economicEffect: number;
    intensity: number;
    mix: number;
    emissionFactor: number;
    totalChange: number;
  }>;
  overallResult: {
    period: string;
    totalChange: number;
    productionEffect: number;
    economicStructureEffect: number;
    energyIntensityEffect: number;
    fuelMixEffect: number;
    emissionFactorEffect: number;
    sumOfEffects: number;
    difference: number;
  };
  fuelMixData: Array<{
    fuel: string;
    startYearEnergy: number;
    endYearEnergy: number;
    startYearShare: number;
    endYearShare: number;
  }>;
  emissionsByFuel: Array<{
    fuel: string;
    startYearEmissions: number;
    endYearEmissions: number;
    change: number;
  }>;
  charts: {
    decompositionChart: any;
    trendChart: any;
    contributionChart: any;
  };
}

// Energy content and emission coefficients from Python script
const ENERGY_CONTENT = {
  Coal: 11.9,        // GJ/tonne (Lignite)
  Gas: 0.0373,       // GJ/m3
  Residual_Oil: 41.00,  // GJ/tonne
  Diesel: 43.0,      // GJ/tonne
  Gasoline: 44.0,    // GJ/tonne
  Electricity: 0.00360, // GJ/kWh
  Heat: 4.184        // GJ/Gcal
};

const EMISSION_COEFF = {
  Coal: 101.0,       // kg CO2/GJ
  Gas: 56.1,         // kg CO2/GJ
  Residual_Oil: 77.4, // kg CO2/GJ
  Diesel: 74.1,      // kg CO2/GJ
  Gasoline: 69.3,    // kg CO2/GJ
  Electricity: 24.0,  // kg CO2/GJ (Hydropower operational emissions)
  Heat: 0.0          // Secondary energy, emissions counted in primary fuels
};

// Column mapping from Python script
const COLUMN_MAPPING = {
  Coal: 'Coal_manufacturing_consumption (thousand tonnes)',
  Gas: 'Gas_manufacturing_consumption (mln m3)',
  Residual_Oil: 'Residual_Oil_manufacturing_consumption (thousand tonnes)',
  Diesel: 'Diesel_manufacturing_consumption (thousand tonnes)',
  Gasoline: 'Gasoline_manufacturing_consumption (thousand tonnes)',
  Electricity: 'Electricity_manufacturing_Consumption (mln kWh)',
  Heat: 'Heat_manufacturing_consumption (thousand gigacalories)'
};

const ECONOMIC_COLUMNS = [
  'Production Output (thousand tonne)',
  'GVA_manufacturing USD',
  'GDP_country (USD)'
];

export class LMDICalculator {
  private epsilon: number = 1e-9;

  // Log mean function matching Python implementation
  private logMean(x: number, y: number): number {
    const x_adj = Math.max(x, this.epsilon * (x >= 0 ? 1 : -1));
    const y_adj = Math.max(y, this.epsilon * (y >= 0 ? 1 : -1));

    if (Math.abs(x - y) < this.epsilon) {
      return (x + y) / 2;
    }
    
    if (x === 0 && y === 0) {
      return 0;
    }
    
    if (x === 0) {
      return y / (Math.log(y_adj) - Math.log(this.epsilon));
    }
    
    if (y === 0) {
      return -x / (Math.log(this.epsilon) - Math.log(x_adj));
    }

    return (y - x) / (Math.log(y) - Math.log(x));
  }

  // Convert fuel consumption to GJ and calculate emissions
  private processFuelData(data: any, fuel: keyof typeof ENERGY_CONTENT): { gj: number; emissions: number } {
    const col = COLUMN_MAPPING[fuel];
    const consumption = data[col] || 0;

    // Multiplier for unit conversion
    let multiplier = 1e3; // For thousand tonnes/Gcal
    if (fuel === 'Gas' || fuel === 'Electricity') {
      multiplier = 1e6; // For mln m3/kWh
    }

    // Convert to GJ
    const gj = consumption * multiplier * ENERGY_CONTENT[fuel];
    
    // Calculate emissions (tons CO2)
    const efValue = EMISSION_COEFF[fuel];
    const emissions = (gj * efValue) / 1000;

    return { gj, emissions };
  }

  // Generate charts data
  private generateCharts(results: any[]): any {
    if (!results.length) return { decompositionChart: null, trendChart: null, contributionChart: null };

    const periods = results.map(r => r.period);
    
    return {
      decompositionChart: {
        data: [
          {
            x: periods,
            y: results.map(r => r.production),
            type: 'bar',
            name: 'Production Effect'
          },
          {
            x: periods,
            y: results.map(r => r.economicEffect),
            type: 'bar',
            name: 'Economic Structure Effect'
          },
          {
            x: periods,
            y: results.map(r => r.intensity),
            type: 'bar',
            name: 'Energy Intensity Effect'
          },
          {
            x: periods,
            y: results.map(r => r.mix),
            type: 'bar',
            name: 'Fuel Mix Effect'
          },
          {
            x: periods,
            y: results.map(r => r.emissionFactor),
            type: 'bar',
            name: 'Emission Factor Effect'
          }
        ],
        layout: {
          title: 'LMDI Decomposition Results',
          xaxis: { title: 'Period' },
          yaxis: { title: 'CO2 Emission Change (tons)' },
          barmode: 'relative'
        }
      },
      trendChart: {
        data: [{
          x: periods,
          y: results.map((r, i) => {
            if (i === 0) return 0;
            return results.slice(1, i + 1).reduce((sum: number, item: any) => 
              sum + item.production + item.economicEffect + item.intensity + item.mix + item.emissionFactor, 0);
          }),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Cumulative Effect'
        }],
        layout: {
          title: 'Cumulative CO2 Emission Changes',
          xaxis: { title: 'Period' },
          yaxis: { title: 'Cumulative Change (tons)' }
        }
      },
      contributionChart: {
        data: [{
          labels: ['Production', 'Economic Structure', 'Energy Intensity', 'Fuel Mix', 'Emission Factor'],
          values: [
            Math.abs(results.reduce((sum: number, r: any) => sum + r.production, 0)),
            Math.abs(results.reduce((sum: number, r: any) => sum + r.economicEffect, 0)),
            Math.abs(results.reduce((sum: number, r: any) => sum + r.intensity, 0)),
            Math.abs(results.reduce((sum: number, r: any) => sum + r.mix, 0)),
            Math.abs(results.reduce((sum: number, r: any) => sum + r.emissionFactor, 0))
          ],
          type: 'pie',
          textinfo: 'label+percent'
        }],
        layout: {
          title: 'Contribution of Each Factor'
        }
      }
    };
  }

  public async processExcelFile(file: File, config: LMDIConfig): Promise<LMDIResult> {
    this.epsilon = config.epsilon || 1e-9;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const sheetName = config.sheetName || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          if (!worksheet) {
            throw new Error(`Sheet "${sheetName}" not found in the Excel file`);
          }

          // Convert Excel data to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          // Filter by years
          const filteredData = jsonData.filter(row => 
            row.Year >= config.startYear && row.Year <= config.endYear
          );

          if (filteredData.length < 2) {
            throw new Error('Insufficient data for LMDI analysis. Need at least 2 years of data.');
          }

          // Sort by year
          filteredData.sort((a, b) => a.Year - b.Year);

          // Validate required columns
          const missingCols = [];
          Object.values(COLUMN_MAPPING).forEach(col => {
            if (!filteredData[0].hasOwnProperty(col)) {
              missingCols.push(col);
            }
          });
          ECONOMIC_COLUMNS.forEach(col => {
            if (!filteredData[0].hasOwnProperty(col)) {
              missingCols.push(col);
            }
          });

          if (missingCols.length > 0) {
            throw new Error(`Missing required columns: ${missingCols.join(', ')}`);
          }

          // Process data for each year
          const processedData = filteredData.map(row => {
            const result: any = {
              year: row.Year,
              output: row['Production Output (thousand tonne)'] || 0,
              gva: row['GVA_manufacturing USD'] || 0,
              gdp: row['GDP_country (USD)'] || 0
            };

            // Process each fuel
            const fuelData: any = {};
            let totalEnergy = 0;
            let totalEmissions = 0;

            Object.keys(ENERGY_CONTENT).forEach(fuel => {
              const { gj, emissions } = this.processFuelData(row, fuel as keyof typeof ENERGY_CONTENT);
              fuelData[`${fuel}_GJ`] = gj;
              fuelData[`${fuel}_Emissions`] = emissions;
              totalEnergy += gj;
              totalEmissions += emissions;
            });

            return {
              ...result,
              ...fuelData,
              totalEnergy,
              totalEmissions
            };
          });

          // Calculate LMDI decomposition for each period
          const yearlyResults = [];
          const decompositions = [];

          for (let i = 0; i < processedData.length - 1; i++) {
            const data0 = processedData[i];
            const data1 = processedData[i + 1];
            const period = `${data0.year}-${data1.year}`;

            const totalChange = data1.totalEmissions - data0.totalEmissions;

            // Intermediate variables
            const y0 = data0.output;
            const y1 = data1.output;
            const logYRatio = Math.log(Math.max(y1, this.epsilon) / Math.max(y0, this.epsilon));

            const vs0 = data0.gva / y0;
            const vs1 = data1.gva / y1;
            const logVsRatio = Math.log(Math.max(vs1, this.epsilon) / Math.max(vs0, this.epsilon));

            const ei0 = data0.totalEnergy / data0.gva;
            const ei1 = data1.totalEnergy / data1.gva;
            const logEiRatio = Math.log(Math.max(ei1, this.epsilon) / Math.max(ei0, this.epsilon));

            // Calculate effects for each fuel
            let prodEffectSum = 0;
            let structEffectSum = 0;
            let intensityEffectSum = 0;
            let mixEffectSum = 0;
            let efEffectSum = 0;

            Object.keys(ENERGY_CONTENT).forEach(fuel => {
              const ci0 = data0[`${fuel}_Emissions`];
              const ci1 = data1[`${fuel}_Emissions`];
              const Lci = this.logMean(ci0, ci1);

              if (Math.abs(Lci) < this.epsilon && Math.abs(ci0) < this.epsilon && Math.abs(ci1) < this.epsilon) {
                return;
              }

              // Production effect
              prodEffectSum += Lci * logYRatio;

              // Economic structure effect
              structEffectSum += Lci * logVsRatio;

              // Energy intensity effect
              intensityEffectSum += Lci * logEiRatio;

              // Fuel mix effect
              const s0 = data0[`${fuel}_GJ`] / data0.totalEnergy;
              const s1 = data1[`${fuel}_GJ`] / data1.totalEnergy;
              const logSRatio = Math.log(Math.max(s1, this.epsilon) / Math.max(s0, this.epsilon));
              mixEffectSum += Lci * logSRatio;

              // Emission factor effect
              const fuelGj0 = data0[`${fuel}_GJ`];
              const fuelGj1 = data1[`${fuel}_GJ`];
              const ef0 = (ci0 / fuelGj0) || 0;
              const ef1 = (ci1 / fuelGj1) || 0;

              let logEfRatio = 0;
              if (Math.abs(ef0 - ef1) >= this.epsilon) {
                logEfRatio = Math.log(Math.max(ef1, this.epsilon) / Math.max(ef0, this.epsilon));
              }
              efEffectSum += Lci * logEfRatio;
            });

            const sumOfEffects = prodEffectSum + structEffectSum + intensityEffectSum + mixEffectSum + efEffectSum;
            const difference = totalChange - sumOfEffects;

            yearlyResults.push({
              period,
              production: prodEffectSum,
              economicEffect: structEffectSum,
              intensity: intensityEffectSum,
              mix: mixEffectSum,
              emissionFactor: efEffectSum,
              totalChange
            });

            decompositions.push({
              period,
              totalChange,
              productionEffect: prodEffectSum,
              economicStructureEffect: structEffectSum,
              energyIntensityEffect: intensityEffectSum,
              fuelMixEffect: mixEffectSum,
              emissionFactorEffect: efEffectSum,
              sumOfEffects,
              difference
            });
          }

          // Calculate overall period results
          const overallResult = this.calculateOverallPeriod(processedData, config);

          // Generate fuel mix and emissions data
          const fuelMixData = this.generateFuelMixData(processedData, config);
          const emissionsByFuel = this.generateEmissionsByFuel(processedData, config);

          // Generate charts
          const charts = this.generateCharts(yearlyResults);

          // Calculate summary
          const summary = {
            totalChange: overallResult.totalChange,
            productionEffect: overallResult.productionEffect,
            economicStructureEffect: overallResult.economicStructureEffect,
            energyIntensityEffect: overallResult.energyIntensityEffect,
            fuelMixEffect: overallResult.fuelMixEffect,
            emissionFactorEffect: overallResult.emissionFactorEffect
          };

          resolve({
            config,
            summary,
            decompositions,
            yearlyResults,
            overallResult,
            fuelMixData,
            emissionsByFuel,
            charts
          });

        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to process Excel file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read the file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private calculateOverallPeriod(processedData: any[], config: LMDIConfig): any {
    const startData = processedData[0];
    const endData = processedData[processedData.length - 1];
    
    const totalChange = endData.totalEmissions - startData.totalEmissions;

    // Intermediate variables for overall period
    const y0 = startData.output;
    const y1 = endData.output;
    const logYRatio = Math.log(Math.max(y1, this.epsilon) / Math.max(y0, this.epsilon));

    const vs0 = startData.gva / y0;
    const vs1 = endData.gva / y1;
    const logVsRatio = Math.log(Math.max(vs1, this.epsilon) / Math.max(vs0, this.epsilon));

    const ei0 = startData.totalEnergy / startData.gva;
    const ei1 = endData.totalEnergy / endData.gva;
    const logEiRatio = Math.log(Math.max(ei1, this.epsilon) / Math.max(ei0, this.epsilon));

    let prodO = 0;
    let structO = 0;
    let intensityO = 0;
    let mixO = 0;
    let efO = 0;

    Object.keys(ENERGY_CONTENT).forEach(fuel => {
      const ci0 = startData[`${fuel}_Emissions`];
      const ci1 = endData[`${fuel}_Emissions`];
      const Lci = this.logMean(ci0, ci1);

      if (Math.abs(Lci) < this.epsilon && Math.abs(ci0) < this.epsilon && Math.abs(ci1) < this.epsilon) {
        return;
      }

      prodO += Lci * logYRatio;
      structO += Lci * logVsRatio;
      intensityO += Lci * logEiRatio;

      const s0 = startData[`${fuel}_GJ`] / startData.totalEnergy;
      const s1 = endData[`${fuel}_GJ`] / endData.totalEnergy;
      const logSRatio = Math.log(Math.max(s1, this.epsilon) / Math.max(s0, this.epsilon));
      mixO += Lci * logSRatio;

      const fuelGj0 = startData[`${fuel}_GJ`];
      const fuelGj1 = endData[`${fuel}_GJ`];
      const ef0 = (ci0 / fuelGj0) || 0;
      const ef1 = (ci1 / fuelGj1) || 0;

      let logEfRatio = 0;
      if (Math.abs(ef0 - ef1) >= this.epsilon) {
        logEfRatio = Math.log(Math.max(ef1, this.epsilon) / Math.max(ef0, this.epsilon));
      }
      efO += Lci * logEfRatio;
    });

    const sumOfEffects = prodO + structO + intensityO + mixO + efO;
    const difference = totalChange - sumOfEffects;

    return {
      period: `${config.startYear}-${config.endYear}`,
      totalChange,
      productionEffect: prodO,
      economicStructureEffect: structO,
      energyIntensityEffect: intensityO,
      fuelMixEffect: mixO,
      emissionFactorEffect: efO,
      sumOfEffects,
      difference
    };
  }

  private generateFuelMixData(processedData: any[], config: LMDIConfig): any[] {
    const startData = processedData[0];
    const endData = processedData[processedData.length - 1];

    return Object.keys(ENERGY_CONTENT).map(fuel => ({
      fuel,
      startYearEnergy: startData[`${fuel}_GJ`],
      endYearEnergy: endData[`${fuel}_GJ`],
      startYearShare: (startData[`${fuel}_GJ`] / startData.totalEnergy) || 0,
      endYearShare: (endData[`${fuel}_GJ`] / endData.totalEnergy) || 0
    }));
  }

  private generateEmissionsByFuel(processedData: any[], config: LMDIConfig): any[] {
    const startData = processedData[0];
    const endData = processedData[processedData.length - 1];

    return Object.keys(ENERGY_CONTENT).map(fuel => ({
      fuel,
      startYearEmissions: startData[`${fuel}_Emissions`],
      endYearEmissions: endData[`${fuel}_Emissions`],
      change: endData[`${fuel}_Emissions`] - startData[`${fuel}_Emissions`]
    }));
  }
}