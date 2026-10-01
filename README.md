# 🎮 NeuroQuest: Gamified Deep Learning Studio

NeuroQuest is an interactive, gamified web application for mastering Deep Learning. It combines playful visual sandboxes, bite-sized Python code challenges, an in-app AI Mentor powered by Google Gemini, and a full real-world capstone project: **DoodleVision AI** (a real-time convolutional neural network sketch-guessing game).

---

## 🌟 Highlights

- **Visual Sandboxes**:
  - ☕ *Neuron Playground*: Adjust weights and biases with live scoring.
  - ⚡ *Activation Bender*: See how ReLU and Sigmoid transform linear lines into non-linear decision boundaries.
  - ⛰️ *Gradient Marble Run*: Visual intuition for learning rates and gradient descent.
  - 🔍 *Kernel Lens*: Live 2D convolution filters across custom sketches.
- **Real-World Project**:
  - **DoodleVision AI**: Train and interact with a real PyTorch CNN classifier predicting doodles in real-time.
- **Sensei Tensor ("Ask AI")**:
  - Connect your Google Gemini API key to ask questions, explain code, get analogies, and take quick pop quizzes.
- **Dynamic Curriculum**:
  - Ingests and updates lessons dynamically as you progress and request new topics.

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10+ (PyTorch, FastAPI, Uvicorn, NumPy)
- Node.js 18+ (Vite Web App)

### 2. Run the Application
1. **Backend Server** (FastAPI + PyTorch Engine):
   ```bash
   python -m uvicorn server.main:app --reload --port 8000
   ```
2. **Frontend App** (Vite Dev Server):
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. Open your browser at `http://localhost:5173`.

---

## 📁 Repository Structure

```
├── CURRICULUM.md              # Detailed learning path & quest descriptions
├── README.md                  # Project overview & running instructions
├── client/                    # Vite + Vanilla JS / CSS Arcade Web Application
│   ├── index.html             # Main entry point with Arcade UI & Canvas
│   ├── src/
│   │   ├── main.js            # App logic, interactive sandboxes, state
│   │   ├── style.css          # Cyber-arcade glassmorphism design system
│   │   ├── curriculum.json    # Dynamic curriculum data engine
│   │   └── ai_tutor.js        # Google Gemini AI Tutor ("Sensei Tensor") client
│   └── package.json
└── server/                    # Python Backend
    ├── main.py                # FastAPI endpoints for code execution & inference
    ├── model.py               # PyTorch DoodleCNN architecture & weights
    └── dataset.py             # QuickDraw doodle dataset loaders & processing
```

---

## 🤖 Ask AI Setup

1. Click the **"Ask AI"** button in the header or sidebar.
2. Click **Settings ⚙️** and paste your Google Gemini API key (from [Google AI Studio](https://aistudio.google.com/)).
3. Your key stays securely in your browser's local storage and communicates directly with the Gemini API.
