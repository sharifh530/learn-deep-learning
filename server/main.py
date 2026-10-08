import io
import sys
import contextlib
import base64
import subprocess
import ast
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response, PlainTextResponse
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

BLOCKED_CALL_NAMES = {
    "system", "popen", "spawn", "execv", "execve", "fork", "kill",
    "remove", "unlink", "rmdir", "rmtree"
}
BLOCKED_MODULES = {"subprocess", "shutil", "ctypes", "winreg"}

def check_code_safety(code_str: str) -> Optional[str]:
    """
    Parses code AST to block destructive system calls while allowing normal PyTorch learning.
    """
    try:
        tree = ast.parse(code_str)
    except SyntaxError:
        return None # Let Python interpreter report syntax errors naturally

    for node in ast.walk(tree):
        # Block import of dangerous modules
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_mod = alias.name.split('.')[0]
                if root_mod in BLOCKED_MODULES:
                    return f"Security Restriction: Module '{alias.name}' is disabled in the NeuroQuest educational sandbox."
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root_mod = node.module.split('.')[0]
                if root_mod in BLOCKED_MODULES:
                    return f"Security Restriction: Importing from '{node.module}' is disabled in the NeuroQuest educational sandbox."
        # Block dangerous function calls like os.system(...)
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute):
                if node.func.attr in BLOCKED_CALL_NAMES:
                    return f"Security Restriction: Calling '{node.func.attr}()' is disabled in the educational sandbox."
            elif isinstance(node.func, ast.Name):
                if node.func.id in BLOCKED_CALL_NAMES:
                    return f"Security Restriction: Calling '{node.func.id}()' is disabled in the educational sandbox."
    return None

@app.post("/api/execute")
def execute_python_code(req: CodeExecutionRequest):
    """
    Executes Python snippets in an isolated subprocess with strict timeout (6.0s),
    pre-imported PyTorch/NumPy environment, output size bounds, and safety restrictions.
    """
    # 1. Pre-check code safety
    security_violation = check_code_safety(req.code)
    if security_violation:
        return {
            "success": False,
            "output": "",
            "error": security_violation
        }

    # 2. Build isolated runner with standard ML imports pre-seeded
    runner_preamble = (
        "import sys, math, random\n"
        "try:\n"
        "    import numpy as np\n"
        "except Exception:\n"
        "    pass\n"
        "try:\n"
        "    import torch\n"
        "    import torch.nn as nn\n"
        "    import torch.nn.functional as F\n"
        "except Exception:\n"
        "    pass\n\n"
    )
    full_code = runner_preamble + req.code
    timeout_sec = 6.0
    max_output_length = 35000

    try:
        proc = subprocess.run(
            [sys.executable, "-u", "-"],
            input=full_code,
            capture_output=True,
            text=True,
            timeout=timeout_sec
        )

        stdout = proc.stdout or ""
        stderr = proc.stderr or ""

        if len(stdout) > max_output_length:
            stdout = stdout[:max_output_length] + "\n\n... [Output truncated after 35,000 characters]"

        if proc.returncode == 0:
            return {
                "success": True,
                "output": stdout,
                "error": None
            }
        else:
            err_output = stderr.strip() or f"Process exited with code {proc.returncode}"
            return {
                "success": False,
                "output": stdout,
                "error": err_output
            }

    except subprocess.TimeoutExpired as e:
        partial_stdout = e.stdout.decode('utf-8', errors='replace') if isinstance(e.stdout, bytes) else (e.stdout or "")
        return {
            "success": False,
            "output": partial_stdout,
            "error": f"TimeoutError: Execution exceeded {timeout_sec}s time limit. Check for infinite loops (e.g. while True) or excessive epochs!"
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": f"ExecutionError: {type(e).__name__}: {str(e)}"
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

class FeatureMapsRequest(BaseModel):
    pixels: List[List[float]] # 28x28 normalized values

@app.post("/api/feature_maps")
def get_model_feature_maps(req: FeatureMapsRequest):
    """
    Extracts intermediate activation feature maps from Conv1 layer for real-time visualization.
    """
    global model
    arr = np.array(req.pixels, dtype=np.float32)
    if arr.shape != (28, 28):
        raise HTTPException(status_code=400, detail="Expected 28x28 grid")

    try:
        import torch
        from server.model import get_feature_maps

        if model is None:
            init_doodle_model()

        tensor = torch.tensor(arr, dtype=torch.float32).unsqueeze(0).unsqueeze(0) # [1, 1, 28, 28]
        raw_maps = get_feature_maps(model, tensor) # (16, 28, 28)
        
        labels = [
            "F0: Horizontal Edge",
            "F1: Vertical Edge",
            "F2: Diagonal Slopes",
            "F3: Corner Detect",
            "F4: Texture Contrast",
            "F5: Ridge Filter",
            "F6: High Contrast Mass",
            "F7: Ambient Contour"
        ]

        selected_maps = []
        for i in range(min(8, raw_maps.shape[0])):
            m = raw_maps[i]
            max_v = float(np.max(m))
            min_v = float(np.min(m))
            denom = max_v - min_v if (max_v - min_v) > 1e-5 else 1.0
            norm_m = ((m - min_v) / denom).clip(0.0, 1.0)
            selected_maps.append({
                "filter_id": i,
                "label": labels[i] if i < len(labels) else f"Kernel {i}",
                "grid": norm_m.round(3).tolist()
            })

        return {
            "success": True,
            "feature_maps": selected_maps
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "feature_maps": []
        }

@app.post("/api/train_step")
def train_step(req: TrainStepRequest):
    """
    Trains the PyTorch DoodleCNN for requested epochs and records live loss and accuracy.
    """
    global model, training_history
    if model is None:
        init_doodle_model()

    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
        from server.dataset import generate_synthetic_doodle_data
        from torch.utils.data import DataLoader

        dataset = generate_synthetic_doodle_data(samples_per_class=60)
        loader = DataLoader(dataset, batch_size=32, shuffle=True)
        optimizer = optim.Adam(model.parameters(), lr=req.learning_rate or 0.003)
        criterion = nn.CrossEntropyLoss()

        model.train()
        total_loss = 0.0
        correct = 0
        total = 0

        num_epochs = max(1, min(10, req.epochs or 1))
        for _ in range(num_epochs):
            epoch_loss = 0.0
            for batch_x, batch_y in loader:
                optimizer.zero_grad()
                out = model(batch_x)
                loss = criterion(out, batch_y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()

                preds = torch.argmax(out, dim=1)
                correct += (preds == batch_y).sum().item()
                total += batch_y.size(0)

            avg_epoch_loss = round(epoch_loss / len(loader), 4)
            current_epoch = len(training_history) + 1
            training_history.append({"epoch": current_epoch, "loss": avg_epoch_loss})
            total_loss = avg_epoch_loss

        model.eval()
        accuracy = round((correct / max(total, 1)) * 100, 1)

        return {
            "success": True,
            "current_epoch": len(training_history),
            "loss": total_loss,
            "accuracy": accuracy,
            "history": training_history[-15:]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset_model")
def reset_model():
    """
    Re-initializes DoodleCNN weights with random initialization for training from scratch.
    """
    global model, training_history
    try:
        from server.model import DoodleCNN
        model = DoodleCNN(num_classes=5)
        model.eval()
        training_history = []
        return {
            "success": True,
            "message": "PyTorch DoodleCNN has been re-initialized with random weights. Predictions are now untrained."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export_weights")
def export_weights():
    """
    Downloads the trained PyTorch state_dict as a binary .pth file.
    """
    global model
    if model is None:
        init_doodle_model()

    try:
        import torch
        buf = io.BytesIO()
        torch.save(model.state_dict(), buf)
        buf.seek(0)
        return Response(
            content=buf.getvalue(),
            media_type="application/octet-stream",
            headers={"Content-Disposition": "attachment; filename=doodle_cnn.pth"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export_script")
def export_inference_script():
    """
    Returns a clean, standalone Python inference script that loads doodle_cnn.pth.
    """
    script = '''# Standalone Inference Script for DoodleVision AI (PyTorch)
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

CLASS_NAMES = ["Cat 🐱", "Bicycle 🚲", "Star ⭐", "Pizza 🍕", "Umbrella ☂️"]

class DoodleCNN(nn.Module):
    def __init__(self, num_classes=5):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, padding=1)
        self.pool1 = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.pool2 = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(32 * 7 * 7, 64)
        self.dropout = nn.Dropout(0.25)
        self.fc2 = nn.Linear(64, num_classes)

    def forward(self, x):
        x = self.pool1(F.relu(self.conv1(x)))
        x = self.pool2(F.relu(self.conv2(x)))
        x = torch.flatten(x, 1)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        return self.fc2(x)

def load_and_predict(weights_path="doodle_cnn.pth", image_28x28=None):
    model = DoodleCNN()
    model.load_state_dict(torch.load(weights_path, map_location="cpu"))
    model.eval()

    if image_28x28 is None:
        # Dummy test input
        image_28x28 = np.zeros((28, 28), dtype=np.float32)

    tensor = torch.tensor(image_28x28).unsqueeze(0).unsqueeze(0)
    with torch.no_grad():
        logits = model(tensor)
        probs = F.softmax(logits, dim=1).squeeze(0).numpy()

    best_idx = np.argmax(probs)
    print(f"Top Prediction: {CLASS_NAMES[best_idx]} ({probs[best_idx]*100:.1f}%)")
    for name, p in zip(CLASS_NAMES, probs):
        print(f" - {name}: {p*100:.1f}%")

if __name__ == "__main__":
    print("Testing DoodleVision CNN...")
    load_and_predict()
'''
    return PlainTextResponse(
        content=script,
        headers={"Content-Disposition": "attachment; filename=serve_doodle.py"}
    )


