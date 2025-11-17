import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.gridspec import GridSpec

# === Configuration ===
FILE_PATH = r"C:\Users\timur\OneDrive\Documents\dataset_raw.xlsx"  # УКАЖИТЕ ВАШ ПУТЬ К ФАЙЛУ
SHEET_NAME = 'Sheet1'
START_YEAR = 2012
END_YEAR = 2023
EPSILON = 1e-9

# === Step 1: Load and Prepare Data ===
print(f"Loading data from: {FILE_PATH}")
try:
    df_full = pd.read_excel(FILE_PATH, sheet_name=SHEET_NAME)
    print("Excel file loaded successfully.")
except FileNotFoundError:
    print(f"ERROR: File not found at {FILE_PATH}")
    exit()
except Exception as e:
    print(f"ERROR: Could not read Excel file. Details: {e}")
    exit()

# Проверка наличия колонки 'Year'
if 'Year' not in df_full.columns:
    print("ERROR: 'Year' column not found in the Excel sheet.")
    exit()

# Фильтрация по годам
df = df_full[(df_full['Year'] >= START_YEAR) & (df_full['Year'] <= END_YEAR)].copy()
required_years = set(range(START_YEAR, END_YEAR + 1))
available_years = set(df['Year'])
if not required_years.issubset(available_years):
    missing_years = required_years - available_years
    print(f"WARNING: Missing data for years: {sorted(list(missing_years))}. Calculations might be incomplete.")

df.set_index('Year', inplace=True)
df.sort_index(inplace=True)
print(f"Data filtered for years {START_YEAR} to {END_YEAR}. Shape: {df.shape}")

# === Step 2: Define Energy Content and Emission Coefficients ===
# === ИЗМЕНЕНИЯ: Удалена Crude_Oil, Heat = 0 для избежания двойного счета ===

# Net Calorific Values (NCV)
energy_content = {
    'Coal': 11.9,  # GJ/tonne (Lignite)
    'Gas': 0.0373,  # GJ/m3
    'Residual_Oil': 41.00,  # GJ/tonne
    'Diesel': 43.0,  # GJ/tonne
    'Gasoline': 44.0,  # GJ/tonne
    'Electricity': 0.00360,  # GJ/kWh
    'Heat': 4.184  # GJ/Gcal
}

# Emission Coefficients (kg CO2 / GJ)
# ВАЖНО: Heat = 0, так как выбросы уже учтены в первичных топливах (Coal, Gas и т.д.)
emission_coeff = {
    'Coal': 101.0,  # kg CO2/GJ
    'Gas': 56.1,  # kg CO2/GJ
    'Residual_Oil': 77.4,  # kg CO2/GJ
    'Diesel': 74.1,  # kg CO2/GJ
    'Gasoline': 69.3,  # kg CO2/GJ
    'Electricity': 24.0,  # kg CO2/GJ (Hydropower operational emissions)
    'Heat': 0.0  # Вторичная энергия, выбросы учтены в первичных источниках
}

# === ИЗМЕНЕНИЯ: Удалена Crude_Oil из column mapping ===
col_mapping = {
    'Coal': 'Coal_manufacturing_consumption (thousand tonnes)',
    'Gas': 'Gas_manufacturing_consumption (mln m3)',
    'Residual_Oil': 'Residual_Oil_manufacturing_consumption (thousand tonnes)',
    'Diesel': 'Diesel_manufacturing_consumption (thousand tonnes)',
    'Gasoline': 'Gasoline_manufacturing_consumption (thousand tonnes)',
    'Electricity': 'Electricity_manufacturing_Consumption (mln kWh)',
    'Heat': 'Heat_manufacturing_consumption (thousand gigacalories)'
}

# Проверка наличия всех необходимых колонок
other_required_cols = ['Production Output (thousand tonne)', 'GVA_manufacturing USD', 'GDP_country (USD)']
all_needed_cols = list(col_mapping.values()) + other_required_cols
missing_cols = [col for col in all_needed_cols if col not in df.columns]

if missing_cols:
    print(f"ERROR: The following required columns are missing from sheet '{SHEET_NAME}': {missing_cols}")
    exit()

print("All required columns found.")

# === Step 3: Convert Fuel Consumption to GJ and Emissions ===
lmdi_data = {}
for fuel in energy_content.keys():
    col = col_mapping[fuel]
    cons = df[col].fillna(0)

    # Определение множителя для перевода в базовые единицы
    multiplier = 1e3  # Для thousand tonnes/Gcal
    if fuel in ['Gas', 'Electricity']:
        multiplier = 1e6  # Для mln m3/kWh

    # Конвертация в ГДж
    gj = cons * multiplier * energy_content[fuel]
    # Вычисление выбросов
    ef_value = emission_coeff[fuel]
    emissions = gj * ef_value / 1000  # Тонны CO2

    lmdi_data[f'{fuel}_GJ'] = gj
    lmdi_data[f'{fuel}_Emissions'] = emissions

# === Step 4: Aggregate and Prepare DataFrame ===
lmdi_df = pd.DataFrame(lmdi_data, index=df.index)
lmdi_df['GVA_manu'] = df['GVA_manufacturing USD'].fillna(0)
lmdi_df['GDP'] = df['GDP_country (USD)'].fillna(0)
lmdi_df['Output'] = df['Production Output (thousand tonne)'].fillna(0)

# Суммарная энергия и выбросы
fuel_cols_gj = [f'{fuel}_GJ' for fuel in energy_content.keys()]
fuel_cols_emissions = [f'{fuel}_Emissions' for fuel in energy_content.keys()]

lmdi_df['Total_Energy'] = lmdi_df[fuel_cols_gj].sum(axis=1)
lmdi_df['Total_Emissions'] = lmdi_df[fuel_cols_emissions].sum(axis=1)

# === Step 5: Log Mean Function ===
def log_mean(x, y, epsilon=EPSILON):
    """Безопасное логарифмическое среднее"""
    x_adj = max(x, epsilon if x >= 0 else x)
    y_adj = max(y, epsilon if y >= 0 else y)

    if abs(x - y) < epsilon:
        return (x + y) / 2
    
    if x == 0 and y == 0:
        return 0
    
    if x == 0:
        return y / (np.log(y_adj) - np.log(epsilon))
    if y == 0:
        return -x / (np.log(epsilon) - np.log(x_adj))

    return (y - x) / (np.log(y) - np.log(x))

# === Step 6: LMDI Additive Decomposition ===
all_results = []
years = sorted(list(lmdi_df.index))
print("\nCalculating LMDI Decomposition for each period...")

for i in range(len(years) - 1):
    year0, year1 = years[i], years[i+1]
    period = f"{year0}-{year1}"
    print(f"  Processing period: {period}")

    data0, data1 = lmdi_df.loc[year0], lmdi_df.loc[year1]
    results = {'Period': period}
    results['Total_Change'] = data1['Total_Emissions'] - data0['Total_Emissions']

    # Промежуточные переменные
    y0_raw, y1_raw = data0['Output'], data1['Output']
    log_y_ratio = np.log(max(y1_raw, EPSILON) / max(y0_raw, EPSILON))

    vs0_raw = (data0['GVA_manu'] / y0_raw) if y0_raw != 0 else 0
    vs1_raw = (data1['GVA_manu'] / y1_raw) if y1_raw != 0 else 0
    log_vs_ratio = np.log(max(vs1_raw, EPSILON) / max(vs0_raw, EPSILON))

    ei0_raw = (data0['Total_Energy'] / data0['GVA_manu']) if data0['GVA_manu'] != 0 else 0
    ei1_raw = (data1['Total_Energy'] / data1['GVA_manu']) if data1['GVA_manu'] != 0 else 0
    log_ei_ratio = np.log(max(ei1_raw, EPSILON) / max(ei0_raw, EPSILON))

    # Инициализация эффектов
    prod_effect_sum, struct_effect_sum, intensity_effect_sum, mix_effect_sum, ef_effect_sum = 0, 0, 0, 0, 0
    total_energy0, total_energy1 = data0['Total_Energy'], data1['Total_Energy']

    # Расчет по каждому топливу
    for fuel in energy_content.keys():
        ci0, ci1 = data0[f'{fuel}_Emissions'], data1[f'{fuel}_Emissions']
        L_ci = log_mean(ci0, ci1)

        if abs(L_ci) < EPSILON and abs(ci0) < EPSILON and abs(ci1) < EPSILON:
            continue

        # Эффекты
        prod_effect_sum += L_ci * log_y_ratio
        struct_effect_sum += L_ci * log_vs_ratio
        intensity_effect_sum += L_ci * log_ei_ratio

        # Эффект структуры топливного микса
        s0_raw = (data0[f'{fuel}_GJ'] / total_energy0) if total_energy0 > EPSILON else 0
        s1_raw = (data1[f'{fuel}_GJ'] / total_energy1) if total_energy1 > EPSILON else 0
        log_s_ratio = np.log(max(s1_raw, EPSILON) / max(s0_raw, EPSILON))
        mix_effect_sum += L_ci * log_s_ratio

        # Эффект изменения коэффициентов выбросов
        fuel_gj0, fuel_gj1 = data0[f'{fuel}_GJ'], data1[f'{fuel}_GJ']
        ef0_calc = (ci0 / fuel_gj0) if fuel_gj0 > EPSILON else 0
        ef1_calc = (ci1 / fuel_gj1) if fuel_gj1 > EPSILON else 0

        if abs(ef0_calc - ef1_calc) < EPSILON:
            log_ef_ratio = 0.0
        else:
            log_ef_ratio = np.log(max(ef1_calc, EPSILON) / max(ef0_calc, EPSILON))
        ef_effect_sum += L_ci * log_ef_ratio

    # Сохранение результатов
    results['Production'] = prod_effect_sum
    results['Economic_Effect (GVA/Output)'] = struct_effect_sum
    results['Intensity (Energy/GVA)'] = intensity_effect_sum
    results['Mix (Fuel Share)'] = mix_effect_sum
    results['Emission_Factor (CO2/Energy)'] = ef_effect_sum

    # Проверка суммы
    results['Sum_of_Effects'] = prod_effect_sum + struct_effect_sum + intensity_effect_sum + mix_effect_sum + ef_effect_sum
    results['Difference'] = results['Total_Change'] - results['Sum_of_Effects']
    all_results.append(results)

if not all_results:
    print("ERROR: No results were generated. Check data.")
    exit()

results_df = pd.DataFrame(all_results).set_index('Period')

# === Step 7: Save Yearly Results ===
print("\nLMDI Decomposition Results (Yearly Periods):")
print("--------------------------------------------")
print(results_df.to_string(float_format="%.2f"))
yearly_csv_path = 'lmdi_yearly_results_without_oil.csv'
results_df.to_csv(yearly_csv_path, float_format='%.2f')
print(f"\nYearly results saved to {yearly_csv_path}")

# === Step 8: Visualization ===
plt.style.use('seaborn-v0_8-whitegrid')
plot_cols_updated = ['Production', 'Economic_Effect (GVA/Output)', 'Intensity (Energy/GVA)', 'Mix (Fuel Share)', 'Emission_Factor (CO2/Energy)']

# --- 8a. Yearly Decomposition Trends ---
if not results_df.empty:
    plt.figure(figsize=(14, 8), dpi=100)
    results_df[plot_cols_updated].plot(kind='bar', stacked=True, figsize=(14, 8),
                                       colormap='viridis', edgecolor='black', linewidth=0.5, ax=plt.gca())
    plt.plot(results_df.index, results_df['Total_Change'], marker='o', linestyle='--', color='red', 
             linewidth=2, markersize=6, label='Total Change')
    plt.title(f'LMDI Decomposition of CO2 Emissions ({START_YEAR}-{END_YEAR}) - Yearly Changes', 
              fontsize=16, fontweight='bold')
    plt.ylabel('Change in Emissions (tCO2)', fontsize=12)
    plt.xlabel('Period', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.axhline(0, color='black', linestyle='-', linewidth=0.8)
    plt.legend(title='Factors', bbox_to_anchor=(1.04, 1), loc='upper left')
    plt.grid(axis='y', linestyle='--', alpha=0.6)
    plt.tight_layout(rect=[0, 0, 0.85, 1])
    plt.savefig('lmdi_yearly_stacked_bar_without_oil.png', dpi=300, bbox_inches='tight')
    plt.show()
else:
    print("Skipping yearly plot as no results were generated.")

# --- 8b. Overall Period Analysis ---
if START_YEAR in lmdi_df.index and END_YEAR in lmdi_df.index and START_YEAR != END_YEAR:
    print(f"\nCalculating overall LMDI for period {START_YEAR}-{END_YEAR}...")
    data0_overall, data1_overall = lmdi_df.loc[START_YEAR], lmdi_df.loc[END_YEAR]
    results_overall = {'Period': f"{START_YEAR}-{END_YEAR}"}
    results_overall['Total_Change'] = data1_overall['Total_Emissions'] - data0_overall['Total_Emissions']

    # Промежуточные переменные (overall)
    y0_o_raw, y1_o_raw = data0_overall['Output'], data1_overall['Output']
    log_y_o_ratio = np.log(max(y1_o_raw, EPSILON) / max(y0_o_raw, EPSILON))

    vs0_o_raw = (data0_overall['GVA_manu'] / y0_o_raw) if y0_o_raw != 0 else 0
    vs1_o_raw = (data1_overall['GVA_manu'] / y1_o_raw) if y1_o_raw != 0 else 0
    log_vs_o_ratio = np.log(max(vs1_o_raw, EPSILON) / max(vs0_o_raw, EPSILON))

    ei0_o_raw = (data0_overall['Total_Energy'] / data0_overall['GVA_manu']) if data0_overall['GVA_manu'] != 0 else 0
    ei1_o_raw = (data1_overall['Total_Energy'] / data1_overall['GVA_manu']) if data1_overall['GVA_manu'] != 0 else 0
    log_ei_o_ratio = np.log(max(ei1_o_raw, EPSILON) / max(ei0_o_raw, EPSILON))

    prod_o, struct_o, intensity_o, mix_o, ef_o = 0, 0, 0, 0, 0
    total_energy0_o, total_energy1_o = data0_overall['Total_Energy'], data1_overall['Total_Energy']

    # Расчет эффектов (overall)
    for fuel in energy_content.keys():
        ci0_o, ci1_o = data0_overall[f'{fuel}_Emissions'], data1_overall[f'{fuel}_Emissions']
        L_ci_o = log_mean(ci0_o, ci1_o)

        if abs(L_ci_o) < EPSILON and abs(ci0_o) < EPSILON and abs(ci1_o) < EPSILON:
            continue

        prod_o += L_ci_o * log_y_o_ratio
        struct_o += L_ci_o * log_vs_o_ratio
        intensity_o += L_ci_o * log_ei_o_ratio

        # Эффект структуры топливного микса
        s0_o_raw = (data0_overall[f'{fuel}_GJ'] / total_energy0_o) if total_energy0_o > EPSILON else 0
        s1_o_raw = (data1_overall[f'{fuel}_GJ'] / total_energy1_o) if total_energy1_o > EPSILON else 0
        log_s_o_ratio = np.log(max(s1_o_raw, EPSILON) / max(s0_o_raw, EPSILON))
        mix_o += L_ci_o * log_s_o_ratio

        # Эффект изменения коэффициентов выбросов
        fuel_gj0_o, fuel_gj1_o = data0_overall[f'{fuel}_GJ'], data1_overall[f'{fuel}_GJ']
        ef0_o_calc = (ci0_o / fuel_gj0_o) if fuel_gj0_o > EPSILON else 0
        ef1_o_calc = (ci1_o / fuel_gj1_o) if fuel_gj1_o > EPSILON else 0

        if abs(ef0_o_calc - ef1_o_calc) < EPSILON:
            log_ef_o_ratio = 0.0
        else:
            log_ef_o_ratio = np.log(max(ef1_o_calc, EPSILON) / max(ef0_o_calc, EPSILON))
        ef_o += L_ci_o * log_ef_o_ratio

    results_overall['Production'] = prod_o
    results_overall['Economic_Effect (GVA/Output)'] = struct_o
    results_overall['Intensity (Energy/GVA)'] = intensity_o
    results_overall['Mix (Fuel Share)'] = mix_o
    results_overall['Emission_Factor (CO2/Energy)'] = ef_o
    results_overall['Sum_of_Effects'] = sum([results_overall[k] for k in plot_cols_updated])
    results_overall['Difference'] = results_overall['Total_Change'] - results_overall['Sum_of_Effects']

    # Вывод результатов (overall)
    print("\nLMDI Decomposition Results (Overall Period):")
    print("---------------------------------------------")
    for k, v_val in results_overall.items():
        if isinstance(v_val, (int, float)):
            print(f"{k}: {v_val:,.2f} tCO2")
        else:
            print(f"{k}: {v_val}")

    # Сохранение результатов (overall)
    overall_results_to_save_df = pd.DataFrame([results_overall])
    overall_results_to_save_df.set_index('Period', inplace=True)
    overall_column_order = ['Total_Change'] + plot_cols_updated + ['Sum_of_Effects', 'Difference']
    overall_results_to_save_df = overall_results_to_save_df[overall_column_order]
    overall_csv_path = f'lmdi_overall_{START_YEAR}-{END_YEAR}_results_without_oil.csv'
    try:
        overall_results_to_save_df.to_csv(overall_csv_path, float_format='%.2f')
        print(f"\nOverall period ({START_YEAR}-{END_YEAR}) LMDI results saved to {overall_csv_path}")
    except Exception as e:
        print(f"ERROR: Could not save overall LMDI results to CSV. Details: {e}")

    # --- 8b. Overall Bar Chart ---
    plt.figure(figsize=(12, 7), dpi=100)
    plot_effects_o = [results_overall.get(label, 0) for label in plot_cols_updated]
    colors = ['#3366CC', '#DC3912', '#109618', '#FF9900', '#990099', '#3B3B3B']
    bars_o = plt.bar(plot_cols_updated, plot_effects_o, color=colors[:len(plot_cols_updated)], 
                     edgecolor='black', linewidth=0.5, alpha=0.8)
    plt.axhline(y=0, color='black', linestyle='--', alpha=0.5)
    plt.axhline(y=results_overall['Total_Change'], color='red', linestyle='-', alpha=0.3)
    plt.text(len(plot_cols_updated) - 0.5, results_overall['Total_Change'],
             f'Total Change: {results_overall["Total_Change"]:,.0f} tCO2', 
             color='red', fontsize=10, ha='right')
    plt.title(f'Overall LMDI Decomposition of CO2 Emissions ({START_YEAR}-{END_YEAR})', 
              fontsize=16, fontweight='bold')
    plt.ylabel('Effect Size (tCO2)', fontsize=12)
    plt.xlabel('Decomposition Factors', fontsize=12)
    plt.xticks(rotation=15, ha='right')
    
    # Подписи на столбцах
    for bar_idx, bar in enumerate(bars_o):
        height = bar.get_height()
        # Определение цвета текста для читаемости
        text_color = 'white' if abs(height) > abs(results_overall.get('Total_Change', 1)) * 0.1 else 'black'
        plt.text(bar.get_x() + bar.get_width() / 2., height + (abs(height) * 0.05 + 5000 * np.sign(height) if height != 0 else 5000),
                 f'{height:,.0f}', ha='center', va='bottom' if height >= 0 else 'top', 
                 fontsize=9, fontweight='bold', color=text_color)

    plt.figtext(0.15, 0.01, "Positive values: Increase in emissions\nNegative values: Decrease in emissions",
                ha="left", fontsize=10, bbox={"facecolor": "white", "alpha": 0.5, "pad": 5})
    plt.grid(axis='y', linestyle='--', alpha=0.3)
    plt.tight_layout(rect=[0, 0.05, 1, 0.95])
    plt.savefig('lmdi_overall_bar_chart_without_oil.png', dpi=300)
    plt.show()

    # --- 8c. Waterfall Chart ---
    plt.figure(figsize=(12, 7))
    values_o = plot_effects_o
    total_o = results_overall['Total_Change']
    cumulative_sum = 0
    bottoms = [0] * len(values_o)
    for i, val in enumerate(values_o):
        bottoms[i] = cumulative_sum
        cumulative_sum += val

    waterfall_colors = colors[:len(values_o)] + [colors[len(values_o) % len(colors)]]
    for i in range(len(values_o)):
        plt.bar(i, values_o[i], bottom=bottoms[i], color=waterfall_colors[i], 
                edgecolor='black', linewidth=0.5)

    # Total bar
    plt.bar(len(values_o), total_o, color=waterfall_colors[-1], edgecolor='black', linewidth=0.5)

    # Соединительные линии
    for i in range(len(values_o) - 1):
        next_cumulative = bottoms[i] + values_o[i]
        plt.plot([i + 0.4, i + 1 - 0.4], [next_cumulative, next_cumulative], 'k--', alpha=0.5)
    
    # Подписи
    plt.ylabel('Effect Size (tCO2)', fontsize=12)
    plt.title(f'Overall LMDI Decomposition Waterfall ({START_YEAR}-{END_YEAR})', 
              fontsize=16, fontweight='bold')
    plt.xticks(list(range(len(values_o))) + [len(values_o)], 
               plot_cols_updated + ['Total Change'], rotation=45, ha='right')
    plt.axhline(0, color='black', linewidth=0.8)

    # Добавление значений
    current_cumulative = 0
    for i, v_val in enumerate(values_o):
        label_y = current_cumulative + v_val / 2
        if abs(v_val) > abs(total_o if total_o != 0 else 1) * 0.02:
            text_color_wf = 'white' if abs(v_val) > abs(total_o if total_o != 0 else 1) * 0.1 else 'black'
            plt.text(i, label_y, f'{v_val:,.0f}', ha='center', va='center', 
                     fontweight='bold', color=text_color_wf, fontsize=9)
        current_cumulative += v_val

    if abs(total_o) > 0:
        sum_abs_effects = sum(np.abs(values_o)) if len(values_o) > 0 else 1
        text_color_total = 'white' if abs(total_o) > abs(sum_abs_effects if sum_abs_effects != 0 else 1) * 0.1 else 'black'
        plt.text(len(values_o), total_o / 2, f'{total_o:,.0f}', ha='center', va='center', 
                 fontweight='bold', color=text_color_total, fontsize=9)

    plt.grid(axis='y', linestyle='--', alpha=0.3)
    plt.tight_layout()
    plt.savefig('lmdi_overall_waterfall_without_oil.png', dpi=300)
    plt.show()
else:
    if START_YEAR == END_YEAR:
        print(f"START_YEAR ({START_YEAR}) and END_YEAR ({END_YEAR}) are the same. Cannot generate overall plots.")
    else:
        print(f"Cannot generate overall ({START_YEAR}-{END_YEAR}) plots as data for these years is missing.")

# === Step 9: Fuel Mix Comparison ===
if START_YEAR in lmdi_df.index and END_YEAR in lmdi_df.index and START_YEAR != END_YEAR:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 7))
    fuels = list(energy_content.keys())
    energy_start = lmdi_df.loc[START_YEAR][[f'{fuel}_GJ' for fuel in fuels]]
    energy_end = lmdi_df.loc[END_YEAR][[f'{fuel}_GJ' for fuel in fuels]]

    # Очистка названий для легенды
    unique_fuels_idx = energy_start.index.union(energy_end.index).map(lambda x: x.replace('_GJ', ''))
    num_unique_fuels = len(unique_fuels_idx)
    pie_colormap = plt.cm.get_cmap('viridis', max(num_unique_fuels, 1))
    color_dict = {fuel_name: pie_colormap(i) for i, fuel_name in enumerate(unique_fuels_idx)}

    # Пирог для START_YEAR
    energy_start_plot = energy_start[energy_start > 1e-6]
    labels_start = [f_name.replace('_GJ', '') for f_name in energy_start_plot.index]
    colors_start = [color_dict[label] for label in labels_start]
    if not energy_start_plot.empty:
        ax1.pie(energy_start_plot, autopct='%1.1f%%', startangle=90, colors=colors_start, pctdistance=0.85)
    ax1.set_title(f'Energy Mix {START_YEAR}', fontsize=14)

    # Пирог для END_YEAR
    energy_end_plot = energy_end[energy_end > 1e-6]
    labels_end = [f_name.replace('_GJ', '') for f_name in energy_end_plot.index]
    colors_end = [color_dict[label] for label in labels_end]
    if not energy_end_plot.empty:
        ax2.pie(energy_end_plot, autopct='%1.1f%%', startangle=90, colors=colors_end, pctdistance=0.85)
    ax2.set_title(f'Energy Mix {END_YEAR}', fontsize=14)

    # Легенда
    from matplotlib.patches import Patch
    active_fuel_names_gj = energy_start_plot.index.union(energy_end_plot.index)
    legend_handles = [Patch(facecolor=color_dict[f_name.replace('_GJ', '')], 
                           label=f_name.replace('_GJ', '')) 
                     for f_name in active_fuel_names_gj]

    if legend_handles:
        fig.legend(handles=legend_handles, title="Fuel Types", loc="lower center", 
                   bbox_to_anchor=(0.5, -0.05), ncol=min(len(legend_handles), 4))
    
    plt.suptitle(f'Change in Energy Mix ({START_YEAR}-{END_YEAR})', fontsize=16, fontweight='bold')
    plt.tight_layout(rect=[0, 0.05, 1, 0.95])
    plt.savefig('energy_mix_comparison_without_oil.png', dpi=300, bbox_inches='tight')
    plt.show()
else:
    print("Cannot generate energy mix comparison plot.")

# === Step 10: Emissions by Fuel Type ===
if START_YEAR in lmdi_df.index and END_YEAR in lmdi_df.index and START_YEAR != END_YEAR:
    # Подготовка данных
    fuel_emissions_comp = pd.DataFrame({
        'Year': [START_YEAR] * len(fuels) + [END_YEAR] * len(fuels),
        'Fuel': list(energy_content.keys()) * 2,
        'Emissions': [lmdi_df.loc[START_YEAR, f'{fuel}_Emissions'] for fuel in fuels] +
                     [lmdi_df.loc[END_YEAR, f'{fuel}_Emissions'] for fuel in fuels]
    })

    total_emissions_start = lmdi_df.loc[START_YEAR, 'Total_Emissions']
    total_emissions_end = lmdi_df.loc[END_YEAR, 'Total_Emissions']

    # Диаграмма выбросов по топливам
    plt.figure(figsize=(12, 7))
    emissions_plot = sns.barplot(x='Fuel', y='Emissions', hue='Year', data=fuel_emissions_comp, palette='viridis')
    plt.title(f'CO2 Emissions by Fuel Type ({START_YEAR} vs {END_YEAR})', fontsize=16, fontweight='bold')
    plt.ylabel('Emissions (tCO2)', fontsize=12)
    plt.xlabel('Fuel Type', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.legend(title='Year')
    for container in emissions_plot.containers:
        emissions_plot.bar_label(container, fmt='%.0f', fontsize=9, padding=3)
    plt.tight_layout()
    plt.savefig('emissions_by_fuel_type_without_oil.png', dpi=300)
    plt.show()

    # Изменение выбросов по топливам
    fuel_changes = {fuel: lmdi_df.loc[END_YEAR, f'{fuel}_Emissions'] - 
                            lmdi_df.loc[START_YEAR, f'{fuel}_Emissions'] for fuel in fuels}
    changes_df = pd.DataFrame(list(fuel_changes.items()), columns=['Fuel', 'Change']).sort_values('Change', ascending=False)
    changes_df = changes_df[changes_df['Change'].abs() > EPSILON]

    if not changes_df.empty:
        plt.figure(figsize=(10, 7))
        change_plot = sns.barplot(y='Fuel', x='Change', data=changes_df, palette='RdBu_r', orient='h',
                                  edgecolor='black', linewidth=0.5)
        plt.title(f'Change in CO2 Emissions by Fuel Type ({START_YEAR}-{END_YEAR})', 
                  fontsize=16, fontweight='bold')
        plt.xlabel('Change in Emissions (tCO2)', fontsize=12)
        plt.ylabel('Fuel Type', fontsize=12)
        plt.axvline(0, color='k', linestyle='--', alpha=0.7)
        for bar in change_plot.patches:
            value = bar.get_width()
            y_pos = bar.get_y() + bar.get_height() / 2
            offset = abs(changes_df['Change']).max() * 0.02
            ha_align = 'left' if value >= 0 else 'right'
            text_x_pos = value + offset * np.sign(value) if value != 0 else offset
            plt.text(text_x_pos, y_pos, f'{value:,.0f}', va='center', ha=ha_align, fontsize=9)
        plt.tight_layout()
        plt.savefig('emissions_change_bar_chart_without_oil.png', dpi=300)
        plt.show()
    else:
        print("Skipping emissions change bar chart due to empty data.")
else:
    print("Cannot generate fuel-specific comparison plots for emissions.")

print("\n=== Script finished successfully ===")
print("\nNOTE: Crude Oil has been excluded from emissions calculations as it is used as feedstock, not fuel.")
print("NOTE: Heat emissions are set to 0 to avoid double-counting with primary fuels (Coal, Gas, etc.).")