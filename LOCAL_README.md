# LMDI Analysis Web Application

A modern web application for performing Logarithmic Mean Divisia Index (LMDI) decomposition analysis on manufacturing energy consumption data and CO2 emissions.

## Features

- **Interactive File Upload**: Drag-and-drop or browse to upload Excel files
- **Configurable Analysis**: Set custom year ranges, sheet names, and precision parameters
- **Comprehensive Visualizations**: 
  - Yearly decomposition trends
  - Overall period analysis
  - Waterfall charts
  - Energy mix comparisons
  - Emissions by fuel type
- **Detailed Results Tables**: View complete LMDI decomposition results
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

1. **Start the Application**:
   ```bash
   npm run dev
   ```
   This will start both the frontend (Vite) and backend (Express) servers.

2. **Open in Browser**:
   Navigate to `http://localhost:5173`

3. **Upload Data**:
   - Click "Choose File" or drag-and-drop your Excel file
   - Configure analysis parameters (start year, end year, sheet name)
   - Click "Calculate LMDI"

## Data Requirements

Your Excel file must contain the following columns:

### Required Columns:
- **Year**: Numeric year values
- **Coal_manufacturing_consumption (thousand tonnes)**: Coal consumption
- **Gas_manufacturing_consumption (mln m3)**: Natural gas consumption
- **Residual_Oil_manufacturing_consumption (thousand tonnes)**: Residual oil consumption
- **Diesel_manufacturing_consumption (thousand tonnes)**: Diesel consumption
- **Gasoline_manufacturing_consumption (thousand tonnes)**: Gasoline consumption
- **Electricity_manufacturing_Consumption (mln kWh)**: Electricity consumption
- **Heat_manufacturing_consumption (thousand gigacalories)**: Heat consumption
- **Production Output (thousand tonne)**: Manufacturing output
- **GVA_manufacturing USD**: Gross Value Added in manufacturing
- **GDP_country (USD)**: Country GDP

### Sample Data
A sample Excel file (`sample_manufacturing_data.xlsx`) has been generated for testing. You can use this file to test the application.

## LMDI Methodology

The application implements the Logarithmic Mean Divisia Index (LMDI) method to decompose changes in CO2 emissions into five factors:

1. **Production Effect**: Changes due to overall production volume
2. **Economic Structure Effect**: Changes in economic structure (GVA/Output ratio)
3. **Energy Intensity Effect**: Changes in energy intensity (Energy/GVA ratio)
4. **Fuel Mix Effect**: Changes in the share of different energy sources
5. **Emission Factor Effect**: Changes in emission factors of energy sources

### Key Features of the Implementation:

- **Additive Decomposition**: Results are additive and sum to the total change
- **No Residual**: Perfect decomposition with no unexplained residual
- **Handles Zero Values**: Robust handling of zero consumption values
- **Configurable Precision**: Adjustable epsilon parameter for numerical stability

## API Endpoints

### POST /api/lmdi/calculate-lmdi
Upload Excel file and calculate LMDI decomposition.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Parameters:
  - `file`: Excel file (.xlsx or .xls)
  - `startYear`: Start year for analysis (default: 2012)
  - `endYear`: End year for analysis (default: 2023)
  - `sheetName`: Excel sheet name (default: "Sheet1")
  - `epsilon`: Numerical precision parameter (default: 1e-9)

**Response:**
```json
{
  "success": true,
  "data": {
    "yearlyResults": [...],
    "overallResult": {...},
    "fuelMixData": [...],
    "emissionsByFuel": [...]
  },
  "config": {...}
}
```

### GET /api/lmdi/health
Health check endpoint.

## Technology Stack

### Frontend:
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Plotly.js** for interactive charts
- **Lucide React** for icons

### Backend:
- **Node.js** with Express
- **TypeScript** for type safety
- **Multer** for file uploads
- **XLSX** for Excel file processing

## Configuration

### Default Parameters:
- Start Year: 2012
- End Year: 2023
- Sheet Name: "Sheet1"
- Epsilon (Precision): 1e-9

### Energy Content Values (GJ per unit):
- Coal: 11.9 GJ/tonne
- Gas: 0.0373 GJ/m³
- Residual Oil: 41.0 GJ/tonne
- Diesel: 43.0 GJ/tonne
- Gasoline: 44.0 GJ/tonne
- Electricity: 0.0036 GJ/kWh
- Heat: 4.184 GJ/Gcal

### Emission Coefficients (kg CO2 per GJ):
- Coal: 101.0 kg CO2/GJ
- Gas: 56.1 kg CO2/GJ
- Residual Oil: 77.4 kg CO2/GJ
- Diesel: 74.1 kg CO2/GJ
- Gasoline: 69.3 kg CO2/GJ
- Electricity: 24.0 kg CO2/GJ
- Heat: 0.0 kg CO2/GJ (avoiding double counting)

## Notes

- **Heat Emissions**: Set to 0 to avoid double-counting with primary fuels
- **Crude Oil**: Excluded as it's typically used as feedstock, not fuel
- **Missing Data**: The application handles missing values by treating them as 0
- **Data Validation**: Years must be between 1900 and 2100

## Development

### Project Structure:
```
├── api/                    # Backend API
│   ├── routes/            # API routes
│   ├── services/          # Business logic (LMDI calculator)
│   └── app.ts             # Express app configuration
├── src/                   # Frontend source
│   ├── components/        # React components
│   ├── pages/            # Page components
│   └── main.tsx          # React entry point
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

### Available Scripts:
- `npm run dev`: Start development servers (frontend + backend)
- `npm run build`: Build for production
- `npm run lint`: Run ESLint
- `npm run check`: TypeScript type checking

## License

This project is created for educational and research purposes.