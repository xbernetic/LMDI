import { LMDICalculator } from './src/services/lmdiCalculator';

// Test chart generation directly
function testChartGenerationDirect() {
  console.log('Testing Chart Generation Directly...');
  
  // Create sample yearly results that would come from LMDI calculation
  const sampleYearlyResults = [
    {
      period: '2012-2013',
      production: 23582.12,
      economicEffect: 0.00,
      intensity: -5360.19,
      mix: -3174.88,
      emissionFactor: 0.00,
      totalChange: 15047.05
    },
    {
      period: '2013-2014',
      production: 24861.23,
      economicEffect: 125.45,
      intensity: -4876.54,
      mix: -2898.76,
      emissionFactor: 15.67,
      totalChange: 17227.05
    }
  ];

  const calculator = new LMDICalculator();
  
  // Test the generateCharts method directly
  try {
    const charts = (calculator as any).generateCharts(sampleYearlyResults);
    
    console.log('✅ Chart Generation Successful!');
    console.log('\n📊 Generated Charts:');
    
    if (charts.decompositionChart) {
      console.log('\n📈 Decomposition Chart:');
      console.log('- Title:', charts.decompositionChart.layout.title);
      console.log('- X-axis:', charts.decompositionChart.layout.xaxis.title);
      console.log('- Y-axis:', charts.decompositionChart.layout.yaxis.title);
      console.log('- Number of traces:', charts.decompositionChart.data.length);
      console.log('- Trace names:', charts.decompositionChart.data.map((d: any) => d.name));
      console.log('- Periods:', charts.decompositionChart.data[0]?.x);
      
      console.log('\n📊 Sample trace data:');
      charts.decompositionChart.data.forEach((trace: any, index: number) => {
        console.log(`${index + 1}. ${trace.name}: [${trace.y?.join(', ')}]`);
      });
    }
    
    if (charts.trendChart) {
      console.log('\n📈 Trend Chart:');
      console.log('- Title:', charts.trendChart.layout.title);
      console.log('- X-axis:', charts.trendChart.layout.xaxis.title);
      console.log('- Y-axis:', charts.trendChart.layout.yaxis.title);
      console.log('- Data points:', charts.trendChart.data[0]?.y);
    }
    
    if (charts.contributionChart) {
      console.log('\n📈 Contribution Chart:');
      console.log('- Title:', charts.contributionChart.layout.title);
      console.log('- Labels:', charts.contributionChart.data[0]?.labels);
      console.log('- Values:', charts.contributionChart.data[0]?.values);
    }
    
    console.log('\n✅ All charts generated successfully!');
    console.log('The charts are ready to be rendered by the PlotlyChart component.');
    
  } catch (error) {
    console.error('❌ Chart generation failed:', error);
  }
}

// Run the test
testChartGenerationDirect();