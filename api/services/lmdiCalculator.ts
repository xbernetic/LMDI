import * as XLSX from 'xlsx';

export interface LMDIConfig {
  startYear: number;
  endYear: number;
  sheetName: string;
  epsilon?: number;
}

export interface LMDIResult {
  period: string;
  totalChange: number;
  production: number;
  economicEffect: number;
  intensity: number;
  mix: number;
  emissionFactor: number;
  sumOfEffects: number;
  difference: number;
}

export interface FuelData {
  coal: number;
  gas: number;
  residualOil: number;
  diesel: number;
  gasoline: number;
  electricity: number;
  heat: number;
}

export interface EnergyContent {
  Coal: number;
  Gas: number;
  Residual_Oil: number;
  Diesel: number;
  Gasoline: number;
  Electricity: number;
  Heat: number;
}

export interface EmissionCoeff {
  Coal: number;
  Gas: number;
  Residual_Oil: number;
  Diesel: number;
  Gasoline: number;
  Electricity: number;
  Heat: number;
}

export interface ColumnMapping {
  Coal: string;
  Gas: string;
  Residual_Oil: string;
  Diesel: string;
  Gasoline: string;
  Electricity: string;
  Heat: string;
}

export class LMDICalculator {
  private energyContent: EnergyContent = {
    Coal: 11.9,  // GJ/tonne (Lignite)
    Gas: 0.0373,  // GJ/m3
    Residual_Oil: 41.00,  // GJ/tonne
    Diesel: 43.0,  // GJ/tonne
    Gasoline: 44.0,  // GJ/tonne
    Electricity: 0.00360,  // GJ/kWh
    Heat: 4.184  // GJ/Gcal
  };

  private emissionCoeff: EmissionCoeff = {
    Coal: 101.0,  // kg CO2/GJ
    Gas: 56.1,  // kg CO2/GJ
    Residual_Oil: 77.4,  // kg CO2/GJ
    Diesel: 74.1,  // kg CO2/GJ
    Gasoline: 69.3,  // kg CO2/GJ
    Electricity: 24.0,  // kg CO2/GJ (Hydropower operational emissions)
    Heat: 0.0  // Secondary energy, emissions accounted for in primary sources
  };

  private columnMapping: ColumnMapping = {
    Coal: 'Coal_manufacturing_consumption (thousand tonnes)',
    Gas: 'Gas_manufacturing_consumption (mln m3)',
    Residual_Oil: 'Residual_Oil_manufacturing_consumption (thousand tonnes)',
    Diesel: 'Diesel_manufacturing_consumption (thousand tonnes)',
    Gasoline: 'Gasoline_manufacturing_consumption (thousand tonnes)',
    Electricity: 'Electricity_manufacturing_Consumption (mln kWh)',
    Heat: 'Heat_manufacturing_consumption (thousand gigacalories)'
  };

  private logMean(x: number, y: number, epsilon: number = 1e-9): number {
    const xAdj = Math.max(x, x >= 0 ? epsilon : x);
    const yAdj = Math.max(y, y >= 0 ? epsilon : y);

    if (Math.abs(x - y) < epsilon) {
      return (x + y) / 2;
    }

    if (x === 0 && y === 0) {
      return 0;
    }

    if (x === 0) {
      return y / (Math.log(yAdj) - Math.log(epsilon));
    }
    if (y === 0) {
      return -x / (Math.log(epsilon) - Math.log(xAdj));
    }

    return (y - x) / (Math.log(y) - Math.log(x));
  }

  private convertExcelDate(serial: number): Date {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    return new Date(utcValue * 1000);
  }

  public async processExcelFile(fileBuffer: Buffer, config: LMDIConfig): Promise<{
    yearlyResults: LMDIResult[];
    overallResult: LMDIResult;
    fuelMixData: any[];
    emissionsByFuel: any[];
  }> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[config.sheetName || 'Sheet1'];
    
    if (!worksheet) {
      throw new Error(`Sheet '${config.sheetName || 'Sheet1'}' not found in Excel file`);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      throw new Error('No data found in the Excel sheet');
    }

    return this.calculateLMDI(jsonData, config);
  }

  private calculateLMDI(data: any[], config: LMDIConfig): {
    yearlyResults: LMDIResult[];
    overallResult: LMDIResult;
    fuelMixData: any[];
    emissionsByFuel: any[];
  } {
    const { startYear, endYear, epsilon = 1e-9 } = config;

    // Filter data by year range
    const filteredData = data.filter(row => {
      const year = this.getYearFromRow(row);
      return year >= startYear && year <= endYear;
    });

    if (filteredData.length === 0) {
      throw new Error(`No data found for years ${startYear}-${endYear}`);
    }

    // Convert data and calculate energy/emissions
    const processedData = this.processData(filteredData, epsilon);
    
    // Calculate LMDI decomposition
    const yearlyResults = this.calculateYearlyLMDI(processedData, epsilon);
    const overallResult = this.calculateOverallLMDI(processedData, startYear, endYear, epsilon);
    
    // Generate additional data for visualizations
    const fuelMixData = this.generateFuelMixData(processedData, startYear, endYear);
    const emissionsByFuel = this.generateEmissionsByFuel(processedData, startYear, endYear);

    return {
      yearlyResults,
      overallResult,
      fuelMixData,
      emissionsByFuel
    };
  }

  private getYearFromRow(row: any): number {
    if (row.Year) {
      return typeof row.Year === 'number' ? row.Year : parseInt(row.Year.toString());
    }
    if (row.year) {
      return typeof row.year === 'number' ? row.year : parseInt(row.year.toString());
    }
    throw new Error('Year column not found in data');
  }

  private processData(data: any[], epsilon: number): Map<number, any> {
    const processedData = new Map<number, any>();
    
    for (const row of data) {
      const year = this.getYearFromRow(row);
      const result: any = { year };

      // Calculate energy consumption and emissions for each fuel
      let totalEnergy = 0;
      let totalEmissions = 0;

      for (const [fuel, columnName] of Object.entries(this.columnMapping)) {
        const consumption = parseFloat(row[columnName] as string) || 0;
        
        // Determine multiplier for unit conversion
        let multiplier = 1e3; // For thousand tonnes/Gcal
        if (fuel === 'Gas' || fuel === 'Electricity') {
          multiplier = 1e6; // For mln m3/kWh
        }

        // Convert to GJ
        const gj = consumption * multiplier * this.energyContent[fuel as keyof EnergyContent];
        
        // Calculate emissions
        const efValue = this.emissionCoeff[fuel as keyof EmissionCoeff];
        const emissions = gj * efValue / 1000; // Tonnes CO2

        result[`${fuel}_GJ`] = gj;
        result[`${fuel}_Emissions`] = emissions;
        
        totalEnergy += gj;
        totalEmissions += emissions;
      }

      // Add economic indicators
      result['GVA_manu'] = parseFloat(row['GVA_manufacturing USD'] as string) || 0;
      result['GDP'] = parseFloat(row['GDP_country (USD)'] as string) || 0;
      result['Output'] = parseFloat(row['Production Output (thousand tonne)'] as string) || 0;
      
      result['Total_Energy'] = totalEnergy;
      result['Total_Emissions'] = totalEmissions;

      processedData.set(year, result);
    }

    return processedData;
  }

  private calculateYearlyLMDI(processedData: Map<number, any>, epsilon: number): LMDIResult[] {
    const years = Array.from(processedData.keys()).sort();
    const results: LMDIResult[] = [];

    for (let i = 0; i < years.length - 1; i++) {
      const year0 = years[i];
      const year1 = years[i + 1];
      const period = `${year0}-${year1}`;

      const data0 = processedData.get(year0);
      const data1 = processedData.get(year1);

      if (!data0 || !data1) continue;

      const totalChange = data1.Total_Emissions - data0.Total_Emissions;

      // Calculate intermediate variables
      const y0Raw = data0.Output;
      const y1Raw = data1.Output;
      const logYRatio = Math.log(Math.max(y1Raw, epsilon) / Math.max(y0Raw, epsilon));

      const vs0Raw = y0Raw !== 0 ? data0.GVA_manu / y0Raw : 0;
      const vs1Raw = y1Raw !== 0 ? data1.GVA_manu / y1Raw : 0;
      const logVsRatio = Math.log(Math.max(vs1Raw, epsilon) / Math.max(vs0Raw, epsilon));

      const ei0Raw = data0.GVA_manu !== 0 ? data0.Total_Energy / data0.GVA_manu : 0;
      const ei1Raw = data1.GVA_manu !== 0 ? data1.Total_Energy / data1.GVA_manu : 0;
      const logEiRatio = Math.log(Math.max(ei1Raw, epsilon) / Math.max(ei0Raw, epsilon));

      // Initialize effects
      let prodEffectSum = 0;
      let structEffectSum = 0;
      let intensityEffectSum = 0;
      let mixEffectSum = 0;
      let efEffectSum = 0;

      const totalEnergy0 = data0.Total_Energy;
      const totalEnergy1 = data1.Total_Energy;

      // Calculate effects for each fuel
      for (const [fuel, _] of Object.entries(this.columnMapping)) {
        const ci0 = data0[`${fuel}_Emissions`];
        const ci1 = data1[`${fuel}_Emissions`];
        const lCi = this.logMean(ci0, ci1, epsilon);

        if (Math.abs(lCi) < epsilon && Math.abs(ci0) < epsilon && Math.abs(ci1) < epsilon) {
          continue;
        }

        // Effects
        prodEffectSum += lCi * logYRatio;
        structEffectSum += lCi * logVsRatio;
        intensityEffectSum += lCi * logEiRatio;

        // Fuel mix structure effect
        const s0Raw = totalEnergy0 > epsilon ? data0[`${fuel}_GJ`] / totalEnergy0 : 0;
        const s1Raw = totalEnergy1 > epsilon ? data1[`${fuel}_GJ`] / totalEnergy1 : 0;
        const logSRatio = Math.log(Math.max(s1Raw, epsilon) / Math.max(s0Raw, epsilon));
        mixEffectSum += lCi * logSRatio;

        // Emission factor change effect
        const fuelGj0 = data0[`${fuel}_GJ`];
        const fuelGj1 = data1[`${fuel}_GJ`];
        const ef0Calc = fuelGj0 > epsilon ? ci0 / fuelGj0 : 0;
        const ef1Calc = fuelGj1 > epsilon ? ci1 / fuelGj1 : 0;

        let logEfRatio = 0.0;
        if (Math.abs(ef0Calc - ef1Calc) >= epsilon) {
          logEfRatio = Math.log(Math.max(ef1Calc, epsilon) / Math.max(ef0Calc, epsilon));
        }
        efEffectSum += lCi * logEfRatio;
      }

      const sumOfEffects = prodEffectSum + structEffectSum + intensityEffectSum + mixEffectSum + efEffectSum;
      const difference = totalChange - sumOfEffects;

      results.push({
        period,
        totalChange,
        production: prodEffectSum,
        economicEffect: structEffectSum,
        intensity: intensityEffectSum,
        mix: mixEffectSum,
        emissionFactor: efEffectSum,
        sumOfEffects,
        difference
      });
    }

    return results;
  }

  private calculateOverallLMDI(processedData: Map<number, any>, startYear: number, endYear: number, epsilon: number): LMDIResult {
    const data0 = processedData.get(startYear);
    const data1 = processedData.get(endYear);

    if (!data0 || !data1) {
      throw new Error(`Data not found for years ${startYear} or ${endYear}`);
    }

    const totalChange = data1.Total_Emissions - data0.Total_Emissions;

    // Calculate intermediate variables
    const y0Raw = data0.Output;
    const y1Raw = data1.Output;
    const logYRatio = Math.log(Math.max(y1Raw, epsilon) / Math.max(y0Raw, epsilon));

    const vs0Raw = y0Raw !== 0 ? data0.GVA_manu / y0Raw : 0;
    const vs1Raw = y1Raw !== 0 ? data1.GVA_manu / y1Raw : 0;
    const logVsRatio = Math.log(Math.max(vs1Raw, epsilon) / Math.max(vs0Raw, epsilon));

    const ei0Raw = data0.GVA_manu !== 0 ? data0.Total_Energy / data0.GVA_manu : 0;
    const ei1Raw = data1.GVA_manu !== 0 ? data1.Total_Energy / data1.GVA_manu : 0;
    const logEiRatio = Math.log(Math.max(ei1Raw, epsilon) / Math.max(ei0Raw, epsilon));

    // Initialize effects
    let prodO = 0;
    let structO = 0;
    let intensityO = 0;
    let mixO = 0;
    let efO = 0;

    const totalEnergy0 = data0.Total_Energy;
    const totalEnergy1 = data1.Total_Energy;

    // Calculate effects for each fuel
    for (const [fuel, _] of Object.entries(this.columnMapping)) {
      const ci0 = data0[`${fuel}_Emissions`];
      const ci1 = data1[`${fuel}_Emissions`];
      const lCi = this.logMean(ci0, ci1, epsilon);

      if (Math.abs(lCi) < epsilon && Math.abs(ci0) < epsilon && Math.abs(ci1) < epsilon) {
        continue;
      }

      prodO += lCi * logYRatio;
      structO += lCi * logVsRatio;
      intensityO += lCi * logEiRatio;

      // Fuel mix structure effect
      const s0Raw = totalEnergy0 > epsilon ? data0[`${fuel}_GJ`] / totalEnergy0 : 0;
      const s1Raw = totalEnergy1 > epsilon ? data1[`${fuel}_GJ`] / totalEnergy1 : 0;
      const logSRatio = Math.log(Math.max(s1Raw, epsilon) / Math.max(s0Raw, epsilon));
      mixO += lCi * logSRatio;

      // Emission factor change effect
      const fuelGj0 = data0[`${fuel}_GJ`];
      const fuelGj1 = data1[`${fuel}_GJ`];
      const ef0Calc = fuelGj0 > epsilon ? ci0 / fuelGj0 : 0;
      const ef1Calc = fuelGj1 > epsilon ? ci1 / fuelGj1 : 0;

      let logEfRatio = 0.0;
      if (Math.abs(ef0Calc - ef1Calc) >= epsilon) {
        logEfRatio = Math.log(Math.max(ef1Calc, epsilon) / Math.max(ef0Calc, epsilon));
      }
      efO += lCi * logEfRatio;
    }

    const sumOfEffects = prodO + structO + intensityO + mixO + efO;
    const difference = totalChange - sumOfEffects;

    return {
      period: `${startYear}-${endYear}`,
      totalChange,
      production: prodO,
      economicEffect: structO,
      intensity: intensityO,
      mix: mixO,
      emissionFactor: efO,
      sumOfEffects,
      difference
    };
  }

  private generateFuelMixData(processedData: Map<number, any>, startYear: number, endYear: number): any[] {
    const fuelMixData = [];
    const fuels = Object.keys(this.columnMapping);

    for (const year of [startYear, endYear]) {
      const data = processedData.get(year);
      if (!data) continue;

      for (const fuel of fuels) {
        fuelMixData.push({
          year,
          fuel: fuel.replace('_', ' '),
          energy: data[`${fuel}_GJ`],
          percentage: data.Total_Energy > 0 ? (data[`${fuel}_GJ`] / data.Total_Energy) * 100 : 0
        });
      }
    }

    return fuelMixData;
  }

  private generateEmissionsByFuel(processedData: Map<number, any>, startYear: number, endYear: number): any[] {
    const emissionsData = [];
    const fuels = Object.keys(this.columnMapping);

    for (const year of [startYear, endYear]) {
      const data = processedData.get(year);
      if (!data) continue;

      for (const fuel of fuels) {
        emissionsData.push({
          year,
          fuel: fuel.replace('_', ' '),
          emissions: data[`${fuel}_Emissions`]
        });
      }
    }

    return emissionsData;
  }
}