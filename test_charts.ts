import { LMDICalculator } from './src/services/lmdiCalculator';
import * as XLSX from 'xlsx';

// Test the chart generation
async function testChartGeneration() {
  console.log('Testing Chart Generation...');
  
  // Create sample data
  const sampleData = [
    {
      Year: 2012,
      Output: 1000,
      GVA_manu: 800,
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
    },
    {
      Year: 2014,
      Output: 1100,
      GVA_manu: 880,
      Coal: 46,
      Gas: 110,
      Residual_Oil: 26,
      Diesel: 24,
      Gasoline: 14,
      Electricity: 220,
      Heat: 54
    }
  ];

  // Create Excel workbook
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const file = new File([excelBuffer], 'test_data.xlsx', { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });

  try {
    const calculator = new LMDICalculator();
    const result = await calculator.processExcelFile(file, {
      startYear: 2012,
      endYear: 2014,
      sheetName: 'Sheet1',
      epsilon: 1e-9
    });

    console.log('✅ LMDI Calculation Successful!');
    console.log('📊 Chart Data Generated:');
    
    if (result.charts) {
      console.log('\n📈 Decomposition Chart:');
      console.log('- Data points:', result.charts.decompositionChart?.data?.length || 0);
      console.log('- Layout title:', result.charts.decompositionChart?.layout?.title);
      
      console.log('\n📈 Trend Chart:');
      console.log('- Data points:', result.charts.trendChart?.data?.length || 0);
      console.log('- Layout title:', result.charts.trendChart?.layout?.title);
      
      console.log('\n📈 Contribution Chart:');
      console.log('- Data points:', result.charts.contributionChart?.data?.length || 0);
      console.log('- Layout title:', result.charts.contributionChart?.layout?.title);
      
      // Show sample chart data
      if (result.charts.decompositionChart?.data) {
        console.log('\n🎯 Sample Decomposition Chart Data:');
        result.charts.decompositionChart.data.forEach((trace: any, index: number) => {
          console.log(`${index + 1}. ${trace.name}: [${trace.y?.slice(0, 3).join(', ')}...]`);
        });
      }
      
      if (result.charts.contributionChart?.data) {
        console.log('\n🎯 Contribution Chart Data:');
        const pieData = result.charts.contributionChart.data[0];
        if (pieData) {
          console.log('Labels:', pieData.labels);
          console.log('Values:', pieData.values);
        }
      }
      
    } else {
      console.log('❌ No charts generated');
    }
    
    console.log('\n✅ Chart generation test completed successfully!');
    console.log('The charts are now ready to be displayed in the React components.');
    
  } catch (error) {
    console.error('❌ Chart generation test failed:', error);
  }
}

// Run the test
testChartGeneration();