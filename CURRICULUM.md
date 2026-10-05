# 🧠 NeuroQuest: Interactive Deep Learning Curriculum & Playbook

Welcome to **NeuroQuest**! This playbook is designed to transform deep learning from dry equations into an engaging, gamified journey. Each quest couples an intuitive mental model, a mini-game or interactive widget, and pure hands-on Python code.

---

## 🗺️ The Learning Path at a Glance

```
[Quest 1: The Coffee-Making Neuron] ➡️ [Quest 2: Sparking Non-Linearity (Activations)]
                         ⬇️
[Quest 4: How Pixels Think] ⬅️ [Quest 3: Lost in the Hills (Loss & Gradients)]
                         ⬇️
[Quest 5: Convolution Magic Lens] ➡️ [Quest 6: Training DoodleVision AI]
                         ⬇️
            [Quest 7: The Live Doodle Battle Arena & API]
```

---

## 📦 Phase 1: Foundational Sparks (Quests 1 - 3)

### ☕ Quest 1: The Neuron That Predicts Coffee
- **The Concept**:
  What is a neuron? Think of it as a tiny decision machine. It takes inputs (e.g., spoon count of sugar, milk volume, shot count of espresso), multiplies each by an importance score (**weight**), adds a personal preference offset (**bias**), and sums them up.
- **The Playful Mini-Game**:
  - *Coffee Recipe Tuner*: You get 3 demanding customers (The Sleepless Coder, The Sweet Tooth, The Pure Espresso Fanatic).
  - Adjust sliders for Weight $W_1$, $W_2$, Bias $b$ until your neuron's prediction matches their delight score!
- **Hands-On Python (NumPy)**:
  ```python
  import numpy as np

  def single_neuron(inputs, weights, bias):
      # Dot product: inputs * weights + bias
      return np.dot(inputs, weights) + bias

  # Inputs: [Sugar (spoons), Milk (ml), Espresso (shots)]
  coffee_sample = np.array([2, 50, 2])
  weights = np.array([0.5, 0.1, 1.2])
  bias = -1.0

  score = single_neuron(coffee_sample, weights, bias)
  print(f"Coffee Delight Score: {score:.2f}")
  ```

---

### ⚡ Quest 2: Sparking Non-Linearity (The Activation Spark)
- **The Concept**:
  Without activation functions, stacking 100 neural layers is mathematically identical to a single linear layer ($y = mx + b$). Real life is curved and complex. We need an activation function to bend the decision boundary!
- **The Playful Mini-Game**:
  - *The XOR Space Bender*: Red dots and blue dots are arranged diagonally. Try drawing a straight ruler through them—it's impossible!
  - Switch on **ReLU** ($f(x) = \max(0, x)$) or **Sigmoid** ($f(x) = \frac{1}{1 + e^{-x}}$) to watch the canvas fold and neatly separate the dots.
- **Hands-On Python**:
  ```python
  import numpy as np

  def relu(x):
      return np.maximum(0, x)

  def sigmoid(x):
      return 1 / (1 + np.exp(-x))

  # Test with negative and positive signals
  raw_signals = np.array([-2.5, -0.5, 0.0, 1.5, 4.0])
  print("ReLU Output:", relu(raw_signals))
  print("Sigmoid Output:", np.round(sigmoid(raw_signals), 3))
  ```

---

### ⛰️ Quest 3: Lost in the Hills (Loss & Gradient Descent)
- **The Concept**:
  How does the network learn?
  1. It makes a guess.
  2. The **Loss Function** measures how terrible the guess was.
  3. **Gradients** tell us the downhill direction to minimize error.
- **The Playful Mini-Game**:
  - *Marble Rolling Simulation*: Drop a ball on a bumpy terrain.
  - Set Learning Rate $\alpha = 0.001$ (too slow, falls asleep) vs $\alpha = 1.5$ (explodes off the mountain) vs $\alpha = 0.05$ (rolls smoothly into the valley).
- **Hands-On Python (PyTorch)**:
  ```python
  import torch

  # A target weight we want the model to discover
  x = torch.tensor([[1.0], [2.0], [3.0]])
  y_true = torch.tensor([[2.0], [4.0], [6.0]])  # y = 2x

  # Random initial weight
  w = torch.tensor([[0.1]], requires_grad=True)
  learning_rate = 0.05

  for epoch in range(20):
      y_pred = x @ w
      loss = torch.mean((y_pred - y_true) ** 2)  # Mean Squared Error
      loss.backward()  # Calculate gradient dLoss/dw

      with torch.no_grad():
          w -= learning_rate * w.grad
          w.grad.zero_()  # Reset gradient for next step

  print(f"Learned Weight: {w.item():.3f} (True: 2.0)")
  ```

---

## 🎨 Phase 2: The Real-World Capstone ("DoodleVision AI")

### 🖼️ Quest 4: How Computers See Pixels
- **The Concept**:
  An image is not magic—it's a 2D or 3D grid of numbers from 0 (black) to 255 (white).
- **The Interactive Widget**:
  - Interactive 16x16 pixel magnifying canvas. Draw an icon and watch the raw 2D array of integers update synchronously in real-time.

### 🔍 Quest 5: The Magic Magnifying Glass (Convolutional Neural Networks)
- **The Concept**:
  Why can't standard feed-forward networks handle images well? They lose spatial relationships.
  **Convolutions** slide small filters (kernels) across the image to detect edges, curves, corners, and textures.
- **Interactive Playground**:
  - Drag an edge-detection kernel `[[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]` over your sketch to reveal the raw outlines.

### 🚀 Quest 6: Training the Doodle Brain
- **The Real Dataset**:
  We select 5 classic categories:
  - 🐱 Cat
  - 🚲 Bicycle
  - ⭐ Star
  - 🍕 Pizza
  - ☂️ Umbrella
- **PyTorch CNN Architecture**:
  ```python
  import torch.nn as nn

  class DoodleCNN(nn.Module):
      def __init__(self, num_classes=5):
          super().__init__()
          self.features = nn.Sequential(
              nn.Conv2d(1, 16, kernel_size=3, padding=1),
              nn.ReLU(),
              nn.MaxPool2d(2, 2),  # 28x28 -> 14x14
              nn.Conv2d(16, 32, kernel_size=3, padding=1),
              nn.ReLU(),
              nn.MaxPool2d(2, 2)   # 14x14 -> 7x7
          )
          self.classifier = nn.Sequential(
              nn.Flatten(),
              nn.Linear(32 * 7 * 7, 64),
              nn.ReLU(),
              nn.Linear(64, num_classes)
          )

      def forward(self, x):
          return self.classifier(self.features(x))
  ```

### ⚔️ Quest 6: The Overfitting Beast & Regularization Arena
- **The Concept**:
  Generalization vs Overfitting. Why deep networks memorize noise and how Dropout ($p=0.5$), L2 Weight Decay, and Early Stopping force neurons to learn robust features.
- **The Interactive Widget**:
  - Live decision boundary regularizer: toggle Dropout and Weight Decay sliders to watch jagged boundaries smooth out.

---

## ⚡ Phase 3: The LLM Odyssey (Quests 7 - 9)

```
[Quest 7: The Attention Machine] ➡️ [Quest 8: Words into Vectors] ➡️ [Quest 9: Inside the GPT Block]
```

### ⚡ Quest 7: The Attention Machine (Transformers & Self-Attention)
- **The Concept**:
  How Transformers replaced sequential RNN loops with parallel $Q, K, V$ matrix multiplications.
  - **Query ($Q$):** What a token seeks.
  - **Key ($K$):** What a token offers.
  - **Value ($V$):** The semantic payload extracted.
  - **Scaled Dot-Product:** $\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) V$
- **The Interactive Sandbox**:
  - Real-time Attention Matrix Heatmap, Polysemy contextualization inspector ("river bank" vs "central bank"), and Multi-Head Attention switcher.

---

### 🔤 Quest 8: Words into Vectors (Tokenization & Embeddings)
- **The Concept**:
  How raw natural language becomes geometric coordinates:
  - **Byte-Pair Encoding (BPE):** Iteratively merging high-frequency byte pairs to prevent Out-Of-Vocabulary (OOV) crashes while keeping vocabularies compact (~32k to 128k).
  - **Dense Embedding Matrix ($V \times d$):** High-dimensional geometry where linear vector directions encode abstract concepts:
    $$\text{Vector}(\text{"king"}) - \text{Vector}(\text{"man"}) + \text{Vector}(\text{"woman"}) \approx \text{Vector}(\text{"queen"})$$
  - **Rotary Position Embeddings (RoPE):** Rotating Query and Key vectors in the 2D complex plane by angle $m\theta$, ensuring attention inner products preserve relative token distance $(m - n)$ naturally.
- **The Interactive Sandbox**:
  - Live BPE Subword Splitter with token ID and byte breakdown.
  - 2D PCA Semantic Vector Arithmetic visualizer.
  - RoPE Rotary Compass dial showing vector rotations as sequence index changes.

---

### 🧱 Quest 9: Inside the GPT Block (Causal Decoder Architecture)
- **The Concept**:
  The complete anatomy of a modern auto-regressive Transformer decoder (Llama 3, Mistral, GPT-4):
  - **Causal Masking:** Adding $-\infty$ to upper-triangle attention logits to forbid peeking at future tokens.
  - **The Residual Highway:** Gradients sprint backward through $x + \mathcal{F}(x)$ via the identity matrix $\mathbf{I}$, preventing vanishing gradients across 80+ layers.
  - **RMSNorm:** Omitting mean-centering ($x - \mu$) to save ~20% GPU memory overhead.
  - **SwiGLU FFN:** Non-linear gated linear unit storing world knowledge and factual associations:
    $$\text{SwiGLU}(x) = (\text{SiLU}(x W_{\text{gate}}) \odot x W_{\text{up}}) W_{\text{down}}$$
  - **Key-Value (KV) Caching:** Caching past Keys and Values in VRAM to slash generation complexity from quadratic $O(N^2)$ to linear $O(N)$.
- **The Interactive Sandbox**:
  - 7-Stage Block Signal Highway card deck with tensor shape inspector.
  - Interactive $5 \times 5$ Causal Mask compatibility matrix.
  - KV Cache Speedup & VRAM Memory footprint simulator.

---

## 🔮 Roadmap: Future Expansion Quests
- **Quest 10: The Generation Loop & Sampling Dynamics:** Logits, Softmax, Temperature ($T$), Top-K, and Top-P (Nucleus) sampling.
- **Quest 11: Post-Training & Alignment:** Pretraining vs SFT, ChatML templates, RLHF, and Direct Preference Optimization (DPO).
- **Quest 12: Parameter-Efficient Fine-Tuning (PEFT & LoRA):** Low-Rank decomposition ($W_0 + B \times A$) and 4-bit quantization (QLoRA).

---

## 🤖 Dynamic Sensei Dojo Integration
At any time, summon **Sensei Tensor** (Google Gemini AI) by clicking **"Ask AI"** or pressing **Esc** to:
- Explain mathematical equations through intuitive analogies.
- Run interactive pop quizzes (+XP).
- Debug and optimize PyTorch code snippets in the built-in Python Lab!

