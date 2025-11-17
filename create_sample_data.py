import pandas as pd
import numpy as np

# Create sample data for LMDI analysis
years = list(range(2012, 2024))
n_years = len(years)

# Generate realistic manufacturing data
np.random.seed(42)

# Base values for different energy sources (in their respective units)
coal_base = 500 + np.random.normal(0, 50, n_years)
gas_base = 1000 + np.random.normal(0, 100, n_years)
residual_oil_base = 200 + np.random.normal(0, 20, n_years)
diesel_base = 150 + np.random.normal(0, 15, n_years)
gasoline_base = 100 + np.random.normal(0, 10, n_years)
electricity_base = 5000 + np.random.normal(0, 500, n_years)
heat_base = 300 + np.random.normal(0, 30, n_years)

# Production and economic indicators
production_output = 1000 + np.cumsum(np.random.normal(20, 50, n_years))
gva_manufacturing = 50000 + np.cumsum(np.random.normal(1000, 2000, n_years))
gdp_country = 1000000 + np.cumsum(np.random.normal(20000, 50000, n_years))

# Create the dataset
data = {
    'Year': years,
    'Coal_manufacturing_consumption (thousand tonnes)': np.maximum(0, coal_base).round(1),
    'Gas_manufacturing_consumption (mln m3)': np.maximum(0, gas_base).round(1),
    'Residual_Oil_manufacturing_consumption (thousand tonnes)': np.maximum(0, residual_oil_base).round(1),
    'Diesel_manufacturing_consumption (thousand tonnes)': np.maximum(0, diesel_base).round(1),
    'Gasoline_manufacturing_consumption (thousand tonnes)': np.maximum(0, gasoline_base).round(1),
    'Electricity_manufacturing_Consumption (mln kWh)': np.maximum(0, electricity_base).round(1),
    'Heat_manufacturing_consumption (thousand gigacalories)': np.maximum(0, heat_base).round(1),
    'Production Output (thousand tonne)': np.maximum(0, production_output).round(1),
    'GVA_manufacturing USD': np.maximum(0, gva_manufacturing).round(0),
    'GDP_country (USD)': np.maximum(0, gdp_country).round(0)
}

# Create DataFrame
df = pd.DataFrame(data)

# Save to Excel file
output_file = 'sample_manufacturing_data.xlsx'
df.to_excel(output_file, sheet_name='Sheet1', index=False)

print(f"Sample data created successfully!")
print(f"File saved as: {output_file}")
print(f"Data shape: {df.shape}")
print("\nFirst few rows:")
print(df.head())
print("\nData summary:")
print(df.describe())