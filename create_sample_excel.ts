import * as XLSX from 'xlsx';

// Sample data matching the expected format
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
  },
  {
    Year: 2015,
    Output: 1150,
    GVA_manu: 920,
    Coal: 44,
    Gas: 115,
    Residual_Oil: 24,
    Diesel: 26,
    Gasoline: 16,
    Electricity: 230,
    Heat: 56
  },
  {
    Year: 2016,
    Output: 1200,
    GVA_manu: 960,
    Coal: 42,
    Gas: 120,
    Residual_Oil: 22,
    Diesel: 28,
    Gasoline: 18,
    Electricity: 240,
    Heat: 58
  }
];

// Create Excel workbook
const ws = XLSX.utils.json_to_sheet(sampleData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

// Save to file
XLSX.writeFile(wb, 'sample_manufacturing_data.xlsx');

console.log('Sample Excel file created: sample_manufacturing_data.xlsx');
console.log('Data includes:');
console.log('- 5 years of manufacturing data (2012-2016)');
console.log('- Production Output, GVA, and energy consumption by fuel type');
console.log('- Ready for LMDI analysis testing');