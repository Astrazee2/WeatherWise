import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
import joblib

# Load dataset
df = pd.read_csv("weather_supply_deficit_dataset.csv").fillna(0)

le = LabelEncoder()

# Supported weather types
possible_weather = [
    'Clear', 'Rain', 'Drizzle', 'Thunderstorm', 'Snow',
    'Mist', 'Fog', 'Haze', 'Clouds', 'Smoke', 'Dust', 'Sand', 'Ash'
]

le.fit(possible_weather)

# Clean and encode
df['Weather Condition'] = df['Weather Condition'].apply(
    lambda w: w if w in possible_weather else 'Clear'
)
df['Weather Condition'] = le.transform(df['Weather Condition'])

# Features
features = [
    'Temperature (°C)', 'Humidity (%)', 'Rainfall (mm)',
    'Wind Speed (km/h)', 'Weather Condition',
    'Total_Orders', 'Total_Received', 'Total_Returned', 'Revenue'
]

# Targets
target_surplus = 'Surplus'
target_deficit = 'Deficits'

# Train-test split
X = df[features]
y_surplus = df[target_surplus]
y_deficit = df[target_deficit]

X_train, X_test, y_train_s, y_test_s = train_test_split(X, y_surplus, test_size=0.2, random_state=42)
X_train_d, X_test_d, y_train_d, y_test_d = train_test_split(X, y_deficit, test_size=0.2, random_state=42)

# Train models
model_surplus = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
model_deficit = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)

model_surplus.fit(X_train, y_train_s)
model_deficit.fit(X_train_d, y_train_d)

# Save models + encoder
joblib.dump(model_surplus, "surplus_predictor.pkl")
joblib.dump(model_deficit, "deficit_predictor.pkl")
joblib.dump(le, "weather_encoder.pkl")

print(" Models for surplus and deficit trained & saved successfully!")
