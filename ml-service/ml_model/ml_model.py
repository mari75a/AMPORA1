import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.metrics import classification_report, f1_score
from sklearn.metrics import accuracy_score

df = pd.read_csv('ev_charging_dataset_2000_rules_applied.csv')

columns_drop = ['city','station_name']
df = df.drop(columns_drop,axis=1)

df['label'] = df['label'].str.strip('"')
label = df['label'].str.split(',\s*')
encoded_new_dataset = label.str.join('|').str.get_dummies()
df = pd.concat([df.drop('label', axis=1), encoded_new_dataset], axis=1)
time_parts = df['time'].str.split(':', expand=True)
Hour = time_parts[0].astype(int)
Minute = time_parts[1].astype(int)
df['total_minutes'] = (Hour * 60) + Minute
df.drop('time', axis=1, inplace=True)

target_columns = [
    'breakfast', 'dinner', 'lunch', 'none', 'shopping',
    'tea/coffee shop', 'visit beautiful place', 'watch film'
]
X = df[['free_time', 'total_minutes']]
y = df[target_columns]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
rf_base = RandomForestClassifier(
    n_estimators=100,
    class_weight='balanced',
    random_state=42,
    max_depth=8,
    min_samples_leaf=5

)
model = MultiOutputClassifier(rf_base)
model.fit(X_train, y_train)
print("successfully")
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred, target_names=y.columns.tolist()))

subset_accuracy = accuracy_score(y_test, y_pred)
print(subset_accuracy)

print("Input Data for Multi-Label Activity Prediction")
while True:
    try:
        free_time_input = float(input("Enter Free Time in hours : "))
        if free_time_input >= 0:
            break
        else:
            print("Please enter a positive value.")
    except ValueError:
        print("Invalid format: Please enter a number.")

while True:
    time_input = input("Enter Time of Day in HH:MM format : ")
    try:
        if ':' not in time_input:
            raise ValueError

        parts = time_input.split(':')
        hour = int(parts[0])
        minute = int(parts[1])

        if 0 <= hour <= 23 and 0 <= minute <= 59:
            break
        else:
            print("Please enter a valid HH:MM format (00:00 - 23:59).")
    except ValueError:
        print("Invalid format: Enter time in HH:MM format.")

total_minutes_value = (hour * 60) + minute

new_data = pd.DataFrame({
    'free_time': [free_time_input],
    'total_minutes': [total_minutes_value]
})

print(f"\nModel Input Data Created: Free Time={new_data['free_time'].iloc[0]}h, Total Minutes={total_minutes_value}m")

y_new_pred_proba = model.predict_proba(new_data)

print("\n--- Model Prediction and Confidence ---")

target_columns = [
    'breakfast', 'dinner', 'lunch', 'none', 'shopping',
    'tea/coffee shop', 'visit beautiful place', 'watch film'
]
predicted_activities = []

print("Activity : Predicted Probability")

# Analyze the probabilities
for i, target in enumerate(target_columns):
    proba_for_1 = y_new_pred_proba[i][:, 1][0]

    if proba_for_1 >= 0.50:
        if proba_for_1 >= 0.90:
            confidence_level = "HIGH Confidence"
        else:
            confidence_level = "MEDIUM Confidence"

        predicted_activities.append(f"{target} ({proba_for_1 * 100:.1f}%)")
        print(f" {target:<25}: {proba_for_1:.4f} ({confidence_level})")
    else:
        print(f" {target:<25}: {proba_for_1:.4f} (Predicts NO)")

print(
    f"\n--- Final Predictions: {', '.join(predicted_activities) if predicted_activities else 'No Activities Predicted'} ---")


