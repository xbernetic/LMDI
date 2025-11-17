import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const SampleDataGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSampleData = () => {
    setIsGenerating(true);
    
    // Generate sample manufacturing energy consumption data with correct column names
    const data = [
      ['Year', 'Coal_manufacturing_consumption (thousand tonnes)', 'Residual_Oil_manufacturing_consumption (thousand tonnes)', 'Gas_manufacturing_consumption (mln m3)', 'Diesel_manufacturing_consumption (thousand tonnes)', 'Gasoline_manufacturing_consumption (thousand tonnes)', 'Electricity_manufacturing_Consumption (mln kWh)', 'Heat_manufacturing_consumption (thousand gigacalories)', 'Production Output (thousand tonne)', 'GVA_manufacturing USD', 'GDP_country (USD)'],
      [2012, 1500, 400, 1200, 200, 100, 2500, 500, 10000, 8000000, 500000000],
      [2013, 1450, 390, 1250, 210, 110, 2600, 520, 10500, 8400000, 525000000],
      [2014, 1400, 380, 1300, 220, 120, 2700, 540, 11000, 8800000, 550000000],
      [2015, 1350, 370, 1350, 230, 130, 2800, 560, 11500, 9200000, 575000000],
      [2016, 1300, 360, 1400, 240, 140, 2900, 580, 12000, 9600000, 600000000],
      [2017, 1250, 350, 1450, 250, 150, 3000, 600, 12500, 10000000, 625000000],
      [2018, 1200, 340, 1500, 260, 160, 3100, 620, 13000, 10400000, 650000000],
      [2019, 1150, 330, 1550, 270, 170, 3200, 640, 13500, 10800000, 675000000],
      [2020, 1100, 320, 1600, 280, 180, 3300, 660, 14000, 11200000, 700000000],
      [2021, 1050, 310, 1650, 290, 190, 3400, 680, 14500, 11600000, 725000000],
      [2022, 1000, 300, 1700, 300, 200, 3500, 700, 15000, 12000000, 750000000],
      [2023, 950, 290, 1750, 310, 210, 3600, 720, 15500, 12400000, 775000000]
    ];

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_manufacturing_data.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsGenerating(false);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileSpreadsheet className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Need Sample Data?</h3>
            <p className="text-sm text-blue-700 mt-1">
              Generate a sample Excel file with manufacturing energy consumption data to test the LMDI analysis.
            </p>
          </div>
        </div>
        
        <button
          onClick={generateSampleData}
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2" size={16} />
              Generate Sample Data
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SampleDataGenerator;