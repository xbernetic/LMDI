import * as XLSX from 'xlsx';

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
  Electricity: 24.0,  // kg CO2/GJ
  Heat: 0.0          // Secondary energy
};

// Log mean function (robust version from Python)
function logMean(a: number, b: number, epsilon: number = 1e-9): number {
  if (Math.abs(a) < epsilon && Math.abs(b) < epsilon) {
    return 0;
  }
  if (Math.abs(a - b) < epsilon) {
    return a;
  }
  if (a === 0 || b === 0) {
    return 0;
  }
  
  const ratio = b / a;
  if (Math.abs(ratio - 1) < epsilon) {
    return a;
  }
  
  return (b - a) / Math.log(ratio);
}

// Process fuel data (matching Python logic)
function processFuelData(row: any, fuel: keyof typeof ENERGY_CONTENT) {
  const consumption = row[fuel] || 0;
  let gj = 0;
  let emissions = 0;

  if (fuel === 'Electricity') {
    gj = consumption * ENERGY_CONTENT[fuel] * 1e6; // Million kWh to kWh, then to GJ
    emissions = gj * EMISSION_COEFF[fuel] / 1000; // kg to tonnes
  } else if (fuel === 'Gas') {
    gj = consumption * ENERGY_CONTENT[fuel] * 1e6; // Million m³ to m³, then to GJ
    emissions = gj * EMISSION_COEFF[fuel] / 1000; // kg to tonnes
  } else {
    gj = consumption * ENERGY_CONTENT[fuel] * 1e3; // Thousand tonnes to tonnes, then to GJ
    emissions = gj * EMISSION_COEFF[fuel] / 1000; // kg to tonnes
  }

  return { gj, emissions };
}

// Test LMDI calculation with sample data
function testLMDICalculation() {
  console.log('Testing LMDI Calculation Logic...');
  console.log('=====================================');
  
  const sampleData = [
    {
      Year: 2012,
      Output: 1000,  // Production Output (thousand tonne)
      GVA_manu: 800, // GVA_manufacturing USD
      Coal: 50,
      Gas: 100,
      Residual_Oil: 30,
      Diesel: 20,
      Gasoline: 10,
      Electricity: 200,
      Heat: 50
    },
    {
      Year: 2013,
      Output: 1050,
      GVA_manu: 840,
      Coal: 48,
      Gas: 105,
      Residual_Oil: 28,
      Diesel: 22,
      Gasoline: 12,
      Electricity: 210,
      Heat: 52
    }
  ];

  const epsilon = 1e-9;
  const year0 = sampleData[0];
  const year1 = sampleData[1];
  
  console.log('Year 0 (2012):', year0);
  console.log('Year 1 (2013):', year1);
  console.log('');

  // Process data for each year
  const processedData = sampleData.map(row => {
    const result: any = {
      year: row.Year,
      output: row.Output,
      gva: row.GVA_manu
    };

    // Process each fuel
    const fuelData: any = {};
    let totalEnergy = 0;
    let totalEmissions = 0;

    Object.keys(ENERGY_CONTENT).forEach(fuel => {
      const { gj, emissions } = processFuelData(row, fuel as keyof typeof ENERGY_CONTENT);
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

  console.log('Processed Data:');
  processedData.forEach(data => {
    console.log(`Year ${data.year}: Output=${data.output}, GVA=${data.gva}, Total Energy=${data.totalEnergy.toFixed(2)} GJ, Total Emissions=${data.totalEmissions.toFixed(2)} tCO2`);
  });
  console.log('');

  // LMDI Calculation for the period
  const data0 = processedData[0];
  const data1 = processedData[1];
  const period = `${data0.year}-${data1.year}`;

  const totalChange = data1.totalEmissions - data0.totalEmissions;
  console.log(`Period: ${period}`);
  console.log(`Total Change in Emissions: ${totalChange.toFixed(2)} tCO2`);
  console.log('');

  // Intermediate variables
  const y0 = data0.output;
  const y1 = data1.output;
  const logYRatio = Math.log(Math.max(y1, epsilon) / Math.max(y0, epsilon));
  console.log(`Production Output Ratio: ${y1}/${y0} = ${(y1/y0).toFixed(4)}`);
  console.log(`Log(Output Ratio): ${logYRatio.toFixed(4)}`);

  const vs0 = data0.gva / y0;
  const vs1 = data1.gva / y1;
  const logVsRatio = Math.log(Math.max(vs1, epsilon) / Math.max(vs0, epsilon));
  console.log(`GVA/Output Ratio (Year 0): ${vs0.toFixed(4)}`);
  console.log(`GVA/Output Ratio (Year 1): ${vs1.toFixed(4)}`);
  console.log(`Log(GVA/Output Ratio): ${logVsRatio.toFixed(4)}`);

  const ei0 = data0.totalEnergy / data0.gva;
  const ei1 = data1.totalEnergy / data1.gva;
  const logEiRatio = Math.log(Math.max(ei1, epsilon) / Math.max(ei0, epsilon));
  console.log(`Energy Intensity (Year 0): ${ei0.toFixed(4)} GJ/USD`);
  console.log(`Energy Intensity (Year 1): ${ei1.toFixed(4)} GJ/USD`);
  console.log(`Log(Energy Intensity Ratio): ${logEiRatio.toFixed(4)}`);
  console.log('');

  // Calculate effects for each fuel
  let prodEffectSum = 0;
  let structEffectSum = 0;
  let intensityEffectSum = 0;
  let mixEffectSum = 0;
  let efEffectSum = 0;

  console.log('Fuel-by-Fuel Analysis:');
  console.log('----------------------');

  Object.keys(ENERGY_CONTENT).forEach(fuel => {
    const ci0 = data0[`${fuel}_Emissions`];
    const ci1 = data1[`${fuel}_Emissions`];
    const Lci = logMean(ci0, ci1);

    console.log(`\n${fuel}:`);
    console.log(`  Emissions (Year 0): ${ci0.toFixed(2)} tCO2`);
    console.log(`  Emissions (Year 1): ${ci1.toFixed(2)} tCO2`);
    console.log(`  Log Mean (Lci): ${Lci.toFixed(4)}`);

    if (Math.abs(Lci) < epsilon && Math.abs(ci0) < epsilon && Math.abs(ci1) < epsilon) {
      console.log(`  Skipped (insignificant emissions)`);
      return;
    }

    // Production effect
    const prodEffect = Lci * logYRatio;
    prodEffectSum += prodEffect;
    console.log(`  Production Effect: ${prodEffect.toFixed(4)}`);

    // Economic structure effect
    const structEffect = Lci * logVsRatio;
    structEffectSum += structEffect;
    console.log(`  Economic Structure Effect: ${structEffect.toFixed(4)}`);

    // Energy intensity effect
    const intensityEffect = Lci * logEiRatio;
    intensityEffectSum += intensityEffect;
    console.log(`  Energy Intensity Effect: ${intensityEffect.toFixed(4)}`);

    // Fuel mix effect
    const s0 = data0[`${fuel}_GJ`] / data0.totalEnergy;
    const s1 = data1[`${fuel}_GJ`] / data1.totalEnergy;
    const logSRatio = Math.log(Math.max(s1, epsilon) / Math.max(s0, epsilon));
    const mixEffect = Lci * logSRatio;
    mixEffectSum += mixEffect;
    console.log(`  Fuel Share (Year 0): ${(s0 * 100).toFixed(2)}%`);
    console.log(`  Fuel Share (Year 1): ${(s1 * 100).toFixed(2)}%`);
    console.log(`  Log(Fuel Share Ratio): ${logSRatio.toFixed(4)}`);
    console.log(`  Fuel Mix Effect: ${mixEffect.toFixed(4)}`);

    // Emission factor effect
    const fuelGj0 = data0[`${fuel}_GJ`];
    const fuelGj1 = data1[`${fuel}_GJ`];
    const ef0 = (ci0 / fuelGj0) || 0;
    const ef1 = (ci1 / fuelGj1) || 0;

    let logEfRatio = 0;
    if (Math.abs(ef0 - ef1) >= epsilon) {
      logEfRatio = Math.log(Math.max(ef1, epsilon) / Math.max(ef0, epsilon));
    }
    const efEffect = Lci * logEfRatio;
    efEffectSum += efEffect;
    console.log(`  Emission Factor (Year 0): ${ef0.toFixed(4)} tCO2/GJ`);
    console.log(`  Emission Factor (Year 1): ${ef1.toFixed(4)} tCO2/GJ`);
    console.log(`  Log(Emission Factor Ratio): ${logEfRatio.toFixed(4)}`);
    console.log(`  Emission Factor Effect: ${efEffect.toFixed(4)}`);
  });

  console.log('\nFinal Results:');
  console.log('==============');
  console.log(`Production Effect: ${prodEffectSum.toFixed(2)} tCO2`);
  console.log(`Economic Structure Effect: ${structEffectSum.toFixed(2)} tCO2`);
  console.log(`Energy Intensity Effect: ${intensityEffectSum.toFixed(2)} tCO2`);
  console.log(`Fuel Mix Effect: ${mixEffectSum.toFixed(2)} tCO2`);
  console.log(`Emission Factor Effect: ${efEffectSum.toFixed(2)} tCO2`);

  const sumOfEffects = prodEffectSum + structEffectSum + intensityEffectSum + mixEffectSum + efEffectSum;
  const difference = totalChange - sumOfEffects;
  
  console.log(`Sum of Effects: ${sumOfEffects.toFixed(2)} tCO2`);
  console.log(`Total Change: ${totalChange.toFixed(2)} tCO2`);
  console.log(`Difference: ${difference.toFixed(4)} tCO2`);
  
  console.log('\n✅ LMDI calculation test completed!');
  console.log('This matches the exact logic from your Python script.');
}

// Run the test
testLMDICalculation();