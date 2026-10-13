# SOLAR DAP --- Project Context

## 1. Project overview

**SOLAR DAP** is a solar irradiance analytics project built around
historical Solcast radiation and weather data for three Indian
locations:

-   Delhi
-   Raipur
-   Jaisalmer

The goal is to turn the data-science work into a polished, credible
analytics product. The project should progress in layers:

1.  Data preparation and exploratory analysis (EDA)
2.  Solar-resource analytics
3.  Machine learning: irradiance estimation, forecasting, and anomaly
    detection
4.  A professional web frontend
5.  Model/API integration and deployment

This is also a learning project. Prefer small, understandable steps and
explain the reasoning behind implementation choices. Avoid dumping large
unexplained code blocks or introducing unnecessary architecture too
early.

## 2. Current dataset

The three CSV files were combined into a Pandas DataFrame named `df`.

-   Combined shape before derived analysis columns: **104,832 rows × 11
    original columns**
-   **34,944 observations per location**
-   Sampling interval: **15 minutes**
-   The user selected a Solcast export date range of **January 1 through
    December 30, 2025**.
-   There are 365 distinct source-date labels in the observed timestamp
    strings, but the export contains 34,944 rows per location,
    equivalent to 364 × 96 intervals. Boundary-date counts should not be
    mistaken for proof of missing records without considering interval
    endpoints and timezone semantics.
-   No missing values were found in the original columns during initial
    checks.
-   No duplicate timestamps were found within each location during
    initial checks.

### Available columns

``` text
air_temp
cloud_opacity
dhi
dni
ghi
gti
relative_humidity
wind_speed_10m
period_end
period
location
period_end_original
period_end_ist
date_ist
source_date
```

The original Solcast timestamp strings are preserved in
`period_end_original`; `period_end` also retains the parsed/source
timestamp representation used in the notebook. `period_end_ist` was
created by parsing timestamps with UTC awareness and converting them to
`Asia/Kolkata`. `date_ist` and `source_date` are derived date fields.

### Timezone caution

The Solcast exports used a longitudinal timezone option. Original
timestamp offsets observed include `+05:00` for Delhi and Raipur and
`+04:00` for Jaisalmer. Converting these timestamps to IST changes their
displayed clock times and sometimes their calendar dates; it does not
add or remove observations.

Before making high-stakes claims about daily or annual irradiation, be
explicit about the interval-end convention and which timezone defines a
"day." Do not silently treat all timestamps as equivalent local solar
time. This issue should not block the initial ML/frontend workflow, but
it must be handled correctly for energy calculations.

## 3. Work completed: EDA

Completed analyses include:

-   Loaded and combined the three city datasets.
-   Checked missing values and duplicate timestamps.
-   Plotted Delhi GHI for June 1--7, 2025.
-   Calculated daily summaries and investigated June 3.
-   Created a daylight correlation heatmap.
-   Created a cloud-opacity-versus-GHI scatterplot with linear
    regression.
-   Discussed confidence intervals, statistical significance,
    correlation, and limitations of causal interpretation.

Cloud-opacity regression results:

-   Slope: `-6.93`
-   Intercept: `574.54`
-   Pearson correlation: `r = -0.530`
-   `R² = 0.281`
-   `p = 2.684e-25`

Interpretation: cloud opacity and GHI have a statistically significant
negative association in the analysed subset, but this does not establish
causation and does not explain all irradiance variation.

The user considers EDA sufficient for now and wants to prioritize ML and
the frontend rather than continuing exploratory plots.

## 4. ML work completed so far

### First model: contemporaneous GHI estimation

A separate `ml_df` copy was created from `df`. Cyclical features were
engineered:

-   `hour_sin`, `hour_cos`
-   `year_sin`, `year_cos`

Predictors used:

-   `air_temp`
-   `cloud_opacity`
-   `relative_humidity`
-   `wind_speed_10m`
-   `hour_sin`, `hour_cos`
-   `year_sin`, `year_cos`
-   one-hot-encoded `location`

Target: `ghi`

The data was split chronologically using an 80th-percentile timestamp
cutoff. A `DummyRegressor(strategy="mean")` baseline was compared with a
`RandomForestRegressor(n_estimators=100, min_samples_leaf=3, random_state=42, n_jobs=-1)`.

Reported holdout results:

  Model             MAE (W/m²)   RMSE (W/m²)       R²
  --------------- ------------ ------------- --------
  Mean baseline         228.40        252.02   -0.028
  Random Forest          23.64         44.95    0.967

An actual-versus-predicted scatterplot showed a strong diagonal
relationship, with scatter around the diagonal. Error analysis by actual
GHI band showed positive mean error (overprediction) in all bands above
50 W/m²:

  Actual GHI band     Mean error (predicted − actual)     MAE    Count
  ----------------- --------------------------------- ------- --------
  0--50 W/m²                                     1.96    2.72   12,486
  50--200 W/m²                                  26.50   49.21    1,721
  200--400 W/m²                                 35.86   60.52    1,993
  400--600 W/m²                                 48.38   66.03    2,486
  600+ W/m²                                     23.10   40.39    2,282

**Important limitation:** this model uses weather observations from the
same interval as the target GHI. It is a contemporaneous
weather-informed irradiance estimation model, not a genuine future
forecasting model. Do not label it as a validated future forecast in the
frontend. Its metrics are from the current chronological holdout setup
and should not be presented as production guarantees.

## 5. Next ML steps

The planned next step is a genuine **one-hour-ahead GHI forecasting
model**.

Sampling is every 15 minutes, so one hour ahead corresponds to four rows
into the future within each location. The draft implementation uses:

-   Target: `ghi.shift(-4)` grouped by location
-   Lagged GHI predictors: current GHI, 15-minute lag, and one-hour lag
-   Weather measured at prediction time: air temperature, cloud opacity,
    relative humidity, wind speed
-   Cyclical time features and one-hot-encoded location
-   Chronological train/test split based on target time

Before treating results as reliable, ensure no future information leaks
into inputs, preserve chronological order within each city, and compare
against a **persistence baseline** (predict future GHI as current GHI).
Evaluate with MAE, RMSE, R², and actual-versus-predicted/residual plots.
Consider night/day effects when interpreting metrics.

After forecasting, build anomaly detection. A sensible initial approach
is to investigate unusually large residuals between observed irradiance
and expected irradiance, but do not equate every large forecast error
with a true physical anomaly. Distinguish model error, weather-driven
variability, data-quality problems, and genuinely unusual behaviour.

## 6. Frontend/product direction

The user does **not** want a basic Streamlit dashboard. The preferred
direction is a polished, portfolio-grade React application. Streamlit is
not required.

### Preferred stack

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   shadcn/ui
-   Recharts for charts
-   Lucide icons
-   FastAPI later, if an API is useful for serving models

Do not jump immediately into a large React/FastAPI/database
architecture. Start with the frontend shell and realistic, clearly
labelled sample data. Add the backend only when model integration is
ready.

### Suggested product pages

1.  **Overview**
    -   Key solar-resource indicators
    -   Historical GHI trend
    -   City comparison
    -   Selected location and date range
2.  **Solar Analytics**
    -   GHI, DNI, DHI, GTI and weather series
    -   Date-range and location filters
    -   Daily/monthly summaries once timestamp semantics are verified
3.  **Forecasting**
    -   Actual versus forecast GHI
    -   Forecast horizon selector
    -   Model metrics and forecast timestamp
    -   Clear distinction between historical estimates and future
        predictions
4.  **Anomaly Monitoring**
    -   Flagged observations
    -   Timestamp, location, observed value, expected value, residual
        and severity
    -   Avoid presenting unvalidated detections as confirmed faults
5.  **Model Insights**
    -   MAE, RMSE, R²
    -   Feature importance or other appropriate explanations
    -   Evaluation period, model version and limitations

### Design direction

-   Dark navy/charcoal foundation with restrained solar-yellow or lime
    accents.
-   Professional typography, clean spacing and strong chart readability.
-   Responsive layout and collapsible sidebar.
-   Clear information hierarchy, tooltips, loading/empty/error states.
-   Avoid excessive gradients, glowing effects, gratuitous animations,
    and generic AI-dashboard styling.
-   Never fabricate live predictions or backend integrations. Label
    mock/sample data clearly.

## 7. Suggested project structure

Start small and expand only when needed:

``` text
solar-dap/
├── docs/
│   └── project_context.md
├── frontend/
│   ├── src/
│   └── ...
├── ml/
│   ├── notebooks/
│   ├── train_forecast.py
│   └── model artifacts (later)
├── backend/                 # later, if using FastAPI
└── README.md
```

The current experimentation environment is Google Colab. Keep using the
existing notebook for now rather than creating a new notebook
unnecessarily. The frontend can be developed locally in Antigravity.

## 8. How an AI coding agent should work on this project

When using Antigravity or another coding agent:

1.  Inspect the existing folder and files before editing.
2.  Read this context file before making architectural decisions.
3.  Propose a concise plan, then implement one milestone at a time.
4.  Start with the frontend application shell and Overview page.
5.  Use sample data when necessary, clearly labelled as sample/mock.
6.  Build reusable components and consistent design tokens.
7.  Run the app and fix type, build, and runtime errors.
8.  Explain the files changed and how to run/test the app.
9.  Avoid overwriting existing work, installing unnecessary
    dependencies, or creating backend infrastructure prematurely.
10. Do not claim the forecasting model, anomaly detector, API, or
    deployment is complete until it actually is.

## 9. Immediate priorities

1.  Finish and evaluate the one-hour-ahead forecast, including a
    persistence baseline.
2.  Begin the React frontend in parallel, starting with the app shell
    and Overview page.
3.  Add the Solar Analytics page with historical data.
4.  Integrate a validated forecasting model.
5.  Add anomaly monitoring.
6.  Deploy and document the project.

The guiding principle is to balance technical validity with visible
product progress. Avoid getting stuck in endless EDA, but do not
sacrifice sound evaluation or misrepresent what the ML models can do.
