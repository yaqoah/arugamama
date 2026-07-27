import os
import json
import numpy as np
import onnxruntime as ort
from http.server import BaseHTTPRequestHandler

# Load artifacts in global scope so they are cached between warm invocations in Vercel
ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'model_artifacts')
MODEL_PATH = os.path.join(ARTIFACTS_DIR, 'model.onnx')
SCALER_PATH = os.path.join(ARTIFACTS_DIR, 'scaler_params.json')
FEATURES_PATH = os.path.join(ARTIFACTS_DIR, 'feature_columns.json')

# Initialize global cache
session = None
scaler_mean = None
scaler_scale = None
feature_columns = None

def load_artifacts():
    global session, scaler_mean, scaler_scale, feature_columns
    if session is None:
        session = ort.InferenceSession(MODEL_PATH)
        
        with open(SCALER_PATH, 'r') as f:
            scaler_data = json.load(f)
            scaler_mean = np.array(scaler_data['mean_'], dtype=np.float32)
            scaler_scale = np.array(scaler_data['scale_'], dtype=np.float32)
            
        with open(FEATURES_PATH, 'r') as f:
            feature_columns = json.load(f)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # 1. Parse incoming request
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            req_body = json.loads(post_data.decode('utf-8'))
            
            # 2. Load model and parameters if not already loaded
            load_artifacts()
            
            # 3. Build feature vector dynamically matching training columns
            feature_vector = np.zeros(len(feature_columns), dtype=np.float32)
            
            for i, col in enumerate(feature_columns):
                # For direct numerical features (annual_rent, cheques, is_furnished, move_in_month)
                if col in req_body:
                    feature_vector[i] = float(req_body[col])
                else:
                    # For one-hot encoded categorical features (e.g., "emirate_Dubai", "layout_2 BR")
                    parts = col.split('_', 1)
                    if len(parts) == 2:
                        cat_key, cat_val = parts
                        if cat_key in req_body and str(req_body[cat_key]) == cat_val:
                            feature_vector[i] = 1.0

            # 4. Standardize numerical features matching StandardScaler behavior
            scaled_vector = (feature_vector - scaler_mean) / scaler_scale
            input_tensor = scaled_vector.reshape(1, -1).astype(np.float32)
            
            # 5. Run inference through ONNX Runtime
            input_name = session.get_inputs()[0].name
            output_name = session.get_outputs()[0].name
            
            result = session.run([output_name], {input_name: input_tensor})[0]
            
            # 6. Build structured response
            response_data = {
                "peak_summer_utility": float(result[0][0]),
                "winter_baseline_utility": float(result[0][1]),
                "liquidity_risk_score": float(result[0][2])
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def do_OPTIONS(self):
        # Pre-flight CORS handler
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
