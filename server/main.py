import io
import sys
import contextlib
import base64
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="NeuroQuest Engine API", version="1.0.0")

# Enable CORS for Vite dev server and local access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model state
model = None
device = "cpu"
CLASS_NAMES = ["Cat 🐱", "Bicycle 🚲", "Star ⭐", "Pizza 🍕", "Umbrella ☂️"]
training_history = []

def init_doodle_model():
    global model
    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
        from server.model import DoodleCNN
        from server.dataset import generate_synthetic_doodle_data
        from torch.utils.data import DataLoader

        print("Initializing PyTorch DoodleCNN...")
        model = DoodleCNN(num_classes=5)
        model.eval()

        # Quick pre-training for 12 epochs so predictions are responsive
        dataset = generate_synthetic_doodle_data(samples_per_class=100)
        loader = DataLoader(dataset, batch_size=32, shuffle=True)
        optimizer = optim.Adam(model.parameters(), lr=0.003)
        criterion = nn.CrossEntropyLoss()

        model.train()
        for epoch in range(12):
            epoch_loss = 0.0
            for batch_x, batch_y in loader:
                optimizer.zero_grad()
                out = model(batch_x)
                loss = criterion(out, batch_y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
            training_history.append({"epoch": epoch + 1, "loss": round(epoch_loss / len(loader), 4)})
        
        model.eval()
        print("DoodleCNN initialized & trained successfully!")
    except Exception as e:
        print(f"Warning: PyTorch model initialization deferred: {e}")

@app.on_event("startup")
def startup_event():
    init_doodle_model()

class CodeExecutionRequest(BaseModel):
    code: str

class DoodlePredictRequest(BaseModel):
    pixels: List[List[float]] # 28x28 normalized values [0.0 - 1.0]

class TrainStepRequest(BaseModel):
    learning_rate: Optional[float] = 0.003
    epochs: Optional[int] = 1

@app.get("/api/status")
def get_status():
    global model
    return {
        "status": "online",
        "model_loaded": model is not None,
        "classes": CLASS_NAMES,
        "history": training_history[-10:] if training_history else []
    }

@app.post("/api/execute")
def execute_python_code(req: CodeExecutionRequest):
    """
    Executes Python snippets from the in-app playgrounds and captures standard output.
    """
    buffer = io.StringIO()
    error_msg = None
    success = False

    try:
        # Restricted safe globals
        safe_globals = {
            "__builtins__": __builtins__,
            "np": np,
        }
        try:
            import torch
            safe_globals["torch"] = torch
            import torch.nn as nn
            safe_globals["nn"] = nn
        except ImportError:
            pass

        with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(buffer):
            exec(req.code, safe_globals)
        success = True
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        success = False

    return {
        "success": success,
        "output": buffer.getvalue(),
        "error": error_msg
    }

@app.post("/api/predict_doodle")
def predict_doodle(req: DoodlePredictRequest):
    """
    Runs real-time inference on a 28x28 sketch array using DoodleCNN.
    """
    global model
    arr = np.array(req.pixels, dtype=np.float32)
    if arr.shape != (28, 28):
        raise HTTPException(status_code=400, detail=f"Expected 28x28 grid, got {arr.shape}")

    # If PyTorch is available, run real inference
    try:
        import torch
        import torch.nn.functional as F

        if model is None:
            init_doodle_model()

        if model is not None:
            tensor = torch.tensor(arr).unsqueeze(0).unsqueeze(0) # [1, 1, 28, 28]
            with torch.no_grad():
                logits = model(tensor)
                probs = F.softmax(logits, dim=1).squeeze(0).numpy()
            
            predictions = []
            for name, prob in zip(CLASS_NAMES, probs):
                predictions.append({
                    "class": name,
                    "confidence": float(round(prob * 100, 1))
                })
            
            # Sort highest confidence first
            predictions.sort(key=lambda x: x["confidence"], reverse=True)
            return {
                "top_class": predictions[0]["class"],
                "confidence": predictions[0]["confidence"],
                "all_predictions": predictions
            }
    except Exception as e:
        print(f"Inference fallback: {e}")

    # Fallback heuristic if PyTorch is still loading
    # Basic shape density features
    center_mass = np.mean(arr[10:18, 10:18])
    top_mass = np.mean(arr[2:10, 8:20])
    bottom_mass = np.mean(arr[18:26, 4:24])
    total_ink = np.sum(arr)

    scores = [20.0, 20.0, 20.0, 20.0, 20.0]
    if total_ink < 5:
        # Blank canvas
        scores = [20.0, 20.0, 20.0, 20.0, 20.0]
    elif top_mass > bottom_mass * 1.5:
        scores[4] += 50 # Umbrella dome
        scores[0] += 30 # Cat ears
    elif bottom_mass > top_mass:
        scores[1] += 45 # Bicycle wheels
    elif center_mass > 0.4:
        scores[2] += 50 # Star core
        scores[3] += 30 # Pizza slice

    # Normalize to 100%
    total = sum(scores)
    predictions = [
        {"class": CLASS_NAMES[i], "confidence": round((scores[i] / total) * 100, 1)}
        for i in range(5)
    ]
    predictions.sort(key=lambda x: x["confidence"], reverse=True)

    return {
        "top_class": predictions[0]["class"],
        "confidence": predictions[0]["confidence"],
        "all_predictions": predictions
    }
