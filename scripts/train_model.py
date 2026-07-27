import os
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.preprocessing import StandardScaler

# Ensure reproducibility
np.random.seed(42)
torch.manual_seed(42)

def calculate_dewa_electricity(kwh):
    cost = 0
    if kwh > 6000:
        cost += (kwh - 6000) * 0.38
        kwh = 6000
    if kwh > 4000:
        cost += (kwh - 4000) * 0.32
        kwh = 4000
    if kwh > 2000:
        cost += (kwh - 2000) * 0.28
        kwh = 2000
    cost += kwh * 0.23
    return cost

def generate_dataset(num_samples=100000):
    emirates = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah"]
    layouts = ["Studio", "1 BR", "2 BR", "3 BR", "4+ BR Villa"]
    ac_types = ["District Cooling", "Central DEWA/SEWA", "Split/Window", "Chiller Free"]
    cheques_options = [1, 2, 4, 6, 12]

    df = pd.DataFrame({
        'emirate': np.random.choice(emirates, num_samples),
        'layout': np.random.choice(layouts, num_samples),
        'annual_rent': np.random.randint(30000, 500000, num_samples),
        'cheques': np.random.choice(cheques_options, num_samples),
        'ac_type': np.random.choice(ac_types, num_samples),
        'is_furnished': np.random.choice([0, 1], num_samples),
        'move_in_month': np.random.randint(1, 13, num_samples)
    })

    # Base electrical consumption (kWh)
    layout_base_kwh_summer = {"Studio": 500, "1 BR": 800, "2 BR": 1200, "3 BR": 2000, "4+ BR Villa": 3500}
    layout_base_kwh_winter = {"Studio": 300, "1 BR": 400, "2 BR": 600, "3 BR": 900, "4+ BR Villa": 1500}
    
    # Cooling consumption (kWh or TRH)
    layout_cooling_summer = {"Studio": 1000, "1 BR": 1500, "2 BR": 2500, "3 BR": 4000, "4+ BR Villa": 7000}
    layout_cooling_winter = {"Studio": 100, "1 BR": 150, "2 BR": 250, "3 BR": 400, "4+ BR Villa": 700}

    summer_utility = []
    winter_utility = []
    liquidity_risk = []

    for _, row in df.iterrows():
        # Housing fee
        housing_fee = 0
        if row['emirate'] in ["Dubai", "Abu Dhabi"]:
            housing_fee = (row['annual_rent'] * 0.05) / 12

        # Base electricity
        base_summer_kwh = layout_base_kwh_summer[row['layout']]
        base_winter_kwh = layout_base_kwh_winter[row['layout']]
        
        cooling_summer_amt = layout_cooling_summer[row['layout']]
        cooling_winter_amt = layout_cooling_winter[row['layout']]

        total_summer_kwh = base_summer_kwh
        total_winter_kwh = base_winter_kwh
        
        summer_ac_cost = 0
        winter_ac_cost = 0

        if row['ac_type'] == "District Cooling":
            # Capacity + Meter + Consumption (TRH assumption: TRH approx = kWh / 3.516)
            summer_ac_cost = 200 + 25 + ((cooling_summer_amt / 3.516) * 0.62)
            winter_ac_cost = 200 + 25 + ((cooling_winter_amt / 3.516) * 0.62)
        elif row['ac_type'] in ["Central DEWA/SEWA", "Split/Window"]:
            total_summer_kwh += cooling_summer_amt
            total_winter_kwh += cooling_winter_amt
        # Chiller Free pays 0 for cooling

        # Electricity Cost
        if row['emirate'] == "Abu Dhabi":
            summer_elec_cost = total_summer_kwh * 0.268
            winter_elec_cost = total_winter_kwh * 0.268
        else:
            summer_elec_cost = calculate_dewa_electricity(total_summer_kwh)
            winter_elec_cost = calculate_dewa_electricity(total_winter_kwh)

        peak_summer = summer_elec_cost + summer_ac_cost + housing_fee
        baseline_winter = winter_elec_cost + winter_ac_cost + housing_fee

        summer_utility.append(peak_summer)
        winter_utility.append(baseline_winter)
        
        # Liquidity Risk Score: Fewer cheques = higher upfront cost = higher risk
        # Scaled between 0 and 10 based on (1/cheques) and rent magnitude
        rent_factor = row['annual_rent'] / 500000.0
        cheque_factor = 1.0 / row['cheques']
        risk = (cheque_factor * 0.7 + rent_factor * 0.3) * 10
        liquidity_risk.append(min(10.0, max(0.0, risk)))

    df['peak_summer_utility'] = summer_utility
    df['winter_baseline_utility'] = winter_utility
    df['liquidity_risk_score'] = liquidity_risk

    return df

class UtilityRiskModel(nn.Module):
    def __init__(self, input_dim):
        super(UtilityRiskModel, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 3)
        )

    def forward(self, x):
        return self.net(x)

def main():
    print("Generating dataset...")
    df = generate_dataset(100000)
    
    # Preprocessing
    categorical_cols = ['emirate', 'layout', 'ac_type']
    numerical_cols = ['annual_rent', 'cheques', 'is_furnished', 'move_in_month']
    target_cols = ['peak_summer_utility', 'winter_baseline_utility', 'liquidity_risk_score']

    df_encoded = pd.get_dummies(df, columns=categorical_cols, drop_first=False)
    
    feature_columns = [col for col in df_encoded.columns if col not in target_cols]
    
    X = df_encoded[feature_columns].values.astype(np.float32)
    y = df_encoded[target_cols].values.astype(np.float32)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Convert to PyTorch tensors
    dataset = torch.utils.data.TensorDataset(torch.tensor(X_scaled), torch.tensor(y))
    dataloader = torch.utils.data.DataLoader(dataset, batch_size=256, shuffle=True)

    input_dim = X.shape[1]
    model = UtilityRiskModel(input_dim)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.MSELoss()

    epochs = 15
    print(f"Training model for {epochs} epochs...")
    model.train()
    for epoch in range(epochs):
        epoch_loss = 0.0
        for batch_X, batch_y in dataloader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        print(f"Epoch [{epoch+1}/{epochs}], Loss: {epoch_loss/len(dataloader):.4f}")

    # Export Artifacts
    print("Exporting artifacts...")
    os.makedirs("./model_artifacts", exist_ok=True)
    
    # 1. ONNX Model
    model.eval()
    dummy_input = torch.randn(1, input_dim)
    torch.onnx.export(
        model, 
        dummy_input, 
        "./model_artifacts/model.onnx",
        opset_version=15,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    
    # 2. Scaler params
    scaler_params = {
        "mean_": scaler.mean_.tolist(),
        "scale_": scaler.scale_.tolist()
    }
    with open("./model_artifacts/scaler_params.json", "w") as f:
        json.dump(scaler_params, f, indent=4)
        
    # 3. Feature columns
    with open("./model_artifacts/feature_columns.json", "w") as f:
        json.dump(feature_columns, f, indent=4)
        
    print("Training complete. Artifacts saved to ./model_artifacts/")

if __name__ == "__main__":
    main()
