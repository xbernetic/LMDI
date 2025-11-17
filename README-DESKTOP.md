# LMDI Desktop Application

A local desktop application for performing Logarithmic Mean Divisia Index (LMDI) analysis on manufacturing energy consumption data to decompose CO2 emission changes.

## Features

- **Complete LMDI Analysis**: Decomposes CO2 emission changes into 5 factors:
  - Production Effect
  - Economic Structure Effect  
  - Energy Intensity Effect
  - Fuel Mix Effect
  - Emission Factor Effect

- **Privacy First**: All calculations are performed locally in your browser. Your data never leaves your computer.

- **Interactive Visualizations**: Generate professional charts and graphs to visualize your LMDI decomposition results.

- **Excel File Support**: Upload your manufacturing energy consumption data in Excel format (.xlsx, .xls).

- **Sample Data Generator**: Create sample data to test the application functionality.

## How to Use

### Method 1: Run from Browser (Recommended)
1. Open your web browser
2. Navigate to: `http://localhost:5173` (if running dev server)
3. Or open `dist/index.html` directly from the build folder

### Method 2: Run Desktop Version
1. Navigate to the `dist` folder
2. Double-click `index.html` to open in your default browser
3. The application will run completely offline

### Using the Application

1. **Generate Sample Data** (Optional):
   - Click "Generate Sample Data" to create a test Excel file
   - This will download a sample manufacturing data file

2. **Upload Your Data**:
   - Click "Choose File" or drag and drop your Excel file
   - Configure analysis parameters:
     - Start Year: Beginning year for analysis (e.g., 2012)
     - End Year: Ending year for analysis (e.g., 2023)
     - Sheet Name: Excel sheet containing your data (default: Sheet1)
     - Epsilon: Precision parameter for calculations (default: 1e-9)

3. **Data Format Requirements**:
   Your Excel file should have the following columns:
   - Column A: Year
   - Column B: Coal consumption (tons)
   - Column C: Oil consumption (tons)
   - Column D: Gas consumption (tons)
   - Column E: Electricity consumption (MWh)
   - Column F: Production output (units)

4. **Run Analysis**:
   - Click "Calculate LMDI" to process your data
   - Results will be displayed with interactive charts and detailed tables

5. **Export Results**:
   - Click "Export Results" to download a JSON file with all analysis results
   - Use "New Analysis" to start with different data or parameters

## Technical Details

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Excel Processing**: XLSX library (client-side)
- **Calculations**: LMDI algorithm implemented in TypeScript
- **Build Tool**: Vite
- **Deployment**: Static files (no server required)

## Energy Coefficients Used

The application uses the following emission coefficients and energy content values:

- **Coal**: 1.92 tCO2/ton, 0.758 energy content
- **Oil**: 2.65 tCO2/ton, 1.0 energy content  
- **Gas**: 2.09 tCO2/ton, 1.35 energy content
- **Electricity**: 0.0 tCO2/MWh (assumed clean)

## Local Development

To run the development server:
```bash
npm run dev
```

To build for production:
```bash
npm run build
```

To preview the built application:
```bash
npm run preview
```

## Privacy & Security

This application processes all data locally in your browser. No data is uploaded to any server, ensuring complete privacy and security of your manufacturing data.

## Support

For issues or questions about the LMDI methodology, please refer to the original Python script or consult LMDI literature.