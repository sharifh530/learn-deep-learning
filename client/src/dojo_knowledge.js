/**
 * NeuroQuest: Sensei Tensor Offline Dojo Knowledge Base
 * Provides comprehensive, instant offline deep learning tutoring, intuitive analogies,
 * runnable Python snippets, and interactive quizzes without requiring an external API key.
 */

export const DOJO_KNOWLEDGE = {
  // --- QUEST-SPECIFIC CURATED RESPONSES ---
  quests: {
    'quest-1': {
      title: 'The Coffee Neuron & Artificial Perceptrons',
      eli10: `☕ **The Coffee Making Metaphor (Explain Like You're 10):**\n\nImagine you are building a robot barista! Your customer has a "Taste Score" from 0 to 10:\n\n1. **Inputs ($x$):** The spoonfuls of ingredients you put in the cup — sugar, milk, and espresso shots.\n2. **Weights ($w$):** How much the customer cares about each ingredient! If they love sugar, sugar's weight is $+3.0$. If they despise bitter espresso, espresso's weight might be $-2.0$.\n3. **Bias ($b$):** The customer's baseline mood before taking a single sip! If they are naturally cheerful, bias is $+2.0$. If they are a grumpy morning critic, bias is $-3.0$.\n\nYour neuron simply multiplies each ingredient by its weight, adds the bias baseline, and makes a decision:\n$$\\text{Output} = (w_1 x_1 + w_2 x_2 + w_3 x_3) + b$$\n\nThat's the entire secret of a linear artificial neuron! 🥋`,
      
      snippet: `\`\`\`python
import numpy as np

# Inputs: [Sugar (spoons), Milk (oz), Espresso (shots)]
inputs = np.array([2.0, 1.0, 3.0])

# Synaptic Weights: customer's preference knobs
weights = np.array([0.8, 0.4, 1.5])

# Bias: baseline morning tolerance threshold
bias = -0.5

# Feedforward linear combination: z = (w · x) + b
linear_sum = np.dot(inputs, weights) + bias
print(f"Coffee Enjoyment Score: {linear_sum:.2f}")

# Activation decision (threshold at 0)
is_happy = linear_sum > 0
print(f"Customer Satisfied? {'Yes! ☕' if is_happy else 'No! 😖'}")
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: The Perceptron Threshold**\n\nSuppose all inputs to a neuron are exactly zero ($x_1=0, x_2=0, x_3=0$). What is the neuron's linear output $\\hat{y}$?",
        options: [
          "A) Always 0.0",
          "B) Equal to the bias term $b$",
          "C) Equal to the sum of weights $\\sum w_i$",
          "D) Undefined (division by zero)"
        ],
        answer: "B",
        explanation: "Correct! When inputs are zero, $\\sum (w_i \\cdot 0) = 0$, so $\\hat{y} = 0 + b = b$. This is precisely why bias is called the intercept or baseline threshold!"
      }
    },

    'quest-2': {
      title: 'Activation Spark & Non-Linear Space Bending',
      eli10: `⚡ **Why Do We Need Activations? (The Origami Sheet Metaphor):**\n\nImagine you have a flat sheet of blue and red dots. If you can only use straight cuts (linear equations), you can only divide the paper with a straight ruler.\n\nNo matter how many straight rulers you stack together, **a straight line plus another straight line is STILL a straight line!** ($w_2(w_1 x + b_1) + b_2 = w_{new} x + b_{new}$).\n\nAn **Activation Function** (like ReLU or Sigmoid) is the power to **fold, crease, and bend the paper in 3D space**! Once the paper is folded, a single flat cut can separate complex spiral, circular, and swirling patterns!\n\n- **ReLU ($max(0, x)$):** The light switch! Turns OFF negative signals to zero, and passes positive signals straight through.\n- **Sigmoid:** The gentle dimmer dial! Squashes everything between $0.0$ and $1.0$.`,

      snippet: `\`\`\`python
import torch
import torch.nn.functional as F

# A batch of incoming linear activations
z = torch.tensor([-3.0, -0.5, 0.0, 1.5, 4.0])

# 1. ReLU: zeroes out negative values
relu_out = F.relu(z)
print("ReLU:", relu_out.tolist())  # [0.0, 0.0, 0.0, 1.5, 4.0]

# 2. Sigmoid: squashes between 0.0 and 1.0 (probabilities)
sigmoid_out = torch.sigmoid(z)
print("Sigmoid:", [round(p, 3) for p in sigmoid_out.tolist()])

# 3. GELU: modern smooth Gaussian activation used in Transformers
gelu_out = F.gelu(z)
print("GELU:", [round(g, 3) for g in gelu_out.tolist()])
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: The Stacking Illusion**\n\nWhat happens if you build a deep neural network with 100 hidden layers, but you do NOT use any activation function?",
        options: [
          "A) It learns 100 times faster",
          "B) It collapses mathematically into a single single-layer linear model",
          "C) The outputs explode to infinity on the first pass",
          "D) It converts into a Convolutional Neural Network"
        ],
        answer: "B",
        explanation: "Brilliant! Because the composition of linear functions is always linear ($W_2(W_1 x) = (W_2 W_1) x = W_{combo} x$), a 100-layer linear network has zero extra expressive power over a 1-layer network!"
      }
    },

    'quest-3': {
      title: 'Gradient Valley & Backpropagation',
      eli10: `⛰️ **Rolling Down Foggy Mountains (The Blind Hiker):**\n\nImagine you are dropped on a misty mountain at midnight with zero visibility. Your goal is to reach the campsite down at the lowest lake (Minimum Loss / Error).\n\n1. **The Ground Slope (The Gradient $\\nabla L$):** You feel the terrain with your feet. The gradient tells you which direction is uphill. So you walk in the **opposite direction** (Downhill / Negative Gradient $-\\nabla L$).\n2. **Step Size (Learning Rate $\\eta$):**\n   - If your step is too tiny ($0.00001$), you take 40 years to reach the camp!\n   - If your step is gigantic ($10.0$), you leap across the mountain and crash over the cliff!\n   - Just right ($0.01 - 0.001$), you stride smoothly into the valley.\n3. **Backpropagation (The Chain Rule):** Passing the blame backwards through the network to tell every single knob how much it contributed to the mistake at the bottom!`,

      snippet: `\`\`\`python
import torch

# Parameter we want to optimize (our weight knob)
w = torch.tensor([5.0], requires_grad=True)

# Target value we want the network to predict
y_target = torch.tensor([10.0])

# Learning rate
lr = 0.1

print(f"Initial Weight: {w.item():.2f}")

for step in range(5):
    # Forward pass: prediction y_hat = w * 2.0
    y_hat = w * 2.0
    
    # Mean Squared Error loss: (y_hat - target)^2
    loss = (y_hat - y_target) ** 2
    
    # Backpropagation: calculate d(loss)/dw
    loss.backward()
    
    # Gradient descent update step (w = w - lr * grad)
    with torch.no_grad():
        w -= lr * w.grad
        w.grad.zero_()  # Clear gradients for next step
        
    print(f"Step {step+1}: Loss = {loss.item():.4f}, Weight = {w.item():.2f}")
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: The Gradient Update Rule**\n\nIn standard Gradient Descent, why is there a MINUS sign in $w \\leftarrow w - \\eta \\cdot \\frac{\\partial L}{\\partial w}$?",
        options: [
          "A) Because gradients are always negative numbers",
          "B) Because we want to minimize loss, so we move in the direction opposite to the steepest ascent",
          "C) To prevent division by zero",
          "D) To convert tensors from float64 to float32"
        ],
        answer: "B",
        explanation: "Correct! The gradient vector $\\nabla L$ points in the direction of greatest increase. Since we want to decrease error down to zero, we take steps in the negative gradient direction!"
      }
    },

    'quest-4': {
      title: 'Computer Vision & Convolutional Neural Networks',
      eli10: `🎨 **The Flashlight Detective (How CNNs See Images):**\n\nImagine trying to recognize a cat in a photo. A standard dense network flattens the image into a long 1D list of numbers and forgets where pixels were next to each other! If the cat shifts 2 inches to the left, the network thinks it's a completely different object!\n\n**A Convolutional Neural Network (CNN) is smarter:**\n1. It takes a tiny $3 \\times 3$ sliding magnifying glass called a **Kernel or Filter**.\n2. It slides the filter across the image row by row, scanning for local patterns (whiskers, curved edges, circular eyes).\n3. Because the same filter slides everywhere, if a cat moves anywhere in the picture, the detector still triggers! This is called **Translation Invariance**.\n4. **Pooling (MaxPool):** Shrinks the image down by keeping only the strongest features, discarding useless noise!`,

      snippet: `\`\`\`python
import torch
import torch.nn as nn

# A simple 2D Convolutional layer:
# 1 input channel (grayscale), 16 output filters, 3x3 kernel size
conv = nn.Conv2d(in_channels=1, out_channels=16, kernel_size=3, padding=1)

# Dummy 28x28 grayscale doodle input: [batch_size, channels, height, width]
x = torch.randn(1, 1, 28, 28)

features = conv(x)
print("Conv1 Output Shape:", features.shape)  # [1, 16, 28, 28]

# Max Pooling (2x2) halves the spatial dimensions: 28x28 -> 14x14
pool = nn.MaxPool2d(kernel_size=2, stride=2)
pooled = pool(features)
print("Pooled Shape:", pooled.shape)          # [1, 16, 14, 14]
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: Convolutions & Stride**\n\nIf you apply a $3 \\times 3$ convolutional kernel to a $28 \\times 28$ image with `padding=1` and `stride=1`, what is the spatial output size?",
        options: [
          "A) 26 × 26",
          "B) 28 × 28",
          "C) 14 × 14",
          "D) 30 × 30"
        ],
        answer: "B",
        explanation: "Spot on! The formula is $O = \\lfloor (W - K + 2P)/S \\rfloor + 1$. Here: $(28 - 3 + 2(1))/1 + 1 = (27)/1 + 1 = 28$. Padding by 1 preserves spatial resolution perfectly!"
      }
    },

    'quest-5': {
      title: 'Kernel Detective & Feature Map Extraction',
      eli10: `🔍 **The Secret Filters of Vision (Sobel, Edges, Ridges):**\n\nHave you ever wondered what the first layer of a deep neural network actually computes? It discovers the same mathematical filters that scientists spent 50 years designing by hand!\n\n- **Horizontal Edge Filter (Sobel H):** Has $+1$ on the top row and $-1$ on the bottom row. When sliding over a horizontal line (like the horizon or a table edge), top minus bottom creates a huge contrast spike!\n- **Vertical Edge Filter (Sobel V):** Has $+1$ on the left and $-1$ on the right, catching vertical stripes, tree trunks, and borders!\n- **Corner & Texture Filters:** Catch cross-points and ripples.\n\nIn deep networks, Layer 1 sees raw edges $\\to$ Layer 2 sees curves & circles $\\to$ Layer 3 sees noses, wheels & ears $\\to$ Output sees full bicycles and cats!`,

      snippet: `\`\`\`python
import torch
import torch.nn.functional as F

# A classic Sobel Horizontal Edge detector filter (3x3)
sobel_h = torch.tensor([
    [-1.0, -2.0, -1.0],
    [ 0.0,  0.0,  0.0],
    [ 1.0,  2.0,  1.0]
]).unsqueeze(0).unsqueeze(0)  # Shape: [1, 1, 3, 3]

# Create a test 6x6 image with a sharp horizontal brightness step
img = torch.zeros((1, 1, 6, 6))
img[:, :, 3:, :] = 1.0  # Bottom half is bright white

# Convolve
edges = F.conv2d(img, sobel_h, padding=1)
print("Detected Horizontal Edge Intensity across row 3:")
print(edges[0, 0, 3, :].tolist())
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: Edge Filter Symmetries**\n\nWhy do standard edge-detection kernels (like Sobel) have coefficients that sum to exactly ZERO ($(-1-2-1) + (0+0+0) + (1+2+1) = 0$)?",
        options: [
          "A) To ensure the model runs faster on GPU",
          "B) So that flat, solid uniform regions produce an output of ZERO (no false edges)",
          "C) To prevent gradients from vanishing in backprop",
          "D) Because weights must always be normalized to unit norm"
        ],
        answer: "B",
        explanation: "Masterful intuition! When an edge filter passes over a completely uniform white or grey wall, all pixels have identical intensity $c$. Summing $(w_i \\cdot c) = c \\sum w_i = c \\cdot 0 = 0$. No edge is reported unless contrast exists!"
      }
    },

    'quest-6': {
      title: 'Overfitting Arena & Regularization',
      eli10: `🐉 **The Over-Memorizing Student (Overfitting):**\n\nImagine studying for a driving exam. Instead of learning the principles of steering and stopping distance, a student memorizes the exact license plate numbers of every test car in the sample questions!\n\nWhen they take the practice test, they score **100% (Zero Training Loss)**. But when taken out on a real highway, they crash instantly because the world has cars they never memorized (**High Generalization Error / Overfitting**).\n\n**How we cure it (Regularization):**\n1. **Dropout:** Randomly disabling 25% of neurons during training! This forces neurons to collaborate and prevents any single neuron from becoming a lazy dictator.\n2. **Weight Decay ($L_2$ Penalty):** Punishes overly large weights, keeping function curves smooth rather than jagged.\n3. **Data Augmentation:** Rotating, jittering, and zooming images so the network learns the underlying concept, not memorized pixels!`,

      snippet: `\`\`\`python
import torch
import torch.nn as nn
import torch.optim as optim

class RegularizedNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(128, 64)
        # 1. Dropout randomly zeros out 30% of activations during training
        self.dropout = nn.Dropout(p=0.30)
        self.fc2 = nn.Linear(64, 10)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.dropout(x)  # Active during model.train(), inactive in model.eval()
        return self.fc2(x)

model = RegularizedNet()
# 2. Weight Decay (L2 regularization penalty) configured directly in optimizer
optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
print("Model initialized with Dropout + AdamW Weight Decay!")
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: Dropout at Evaluation Time**\n\nDuring testing/inference (`model.eval()`), what does PyTorch's `nn.Dropout` layer do?",
        options: [
          "A) Continues dropping 50% of neurons to save memory",
          "B) Turns completely OFF and scales weights so all neurons fire deterministically",
          "C) Sets all weights to zero",
          "D) Inverts the output activations"
        ],
        answer: "B",
        explanation: "Correct! Dropout is strictly a training-time regularizer. During inference, we want deterministic, robust predictions using the full ensemble of all trained neurons!"
      }
    },

    'quest-7': {
      title: 'Attention Machine & Transformer Foundations',
      eli10: `⚡ **The Library Search Metaphor (Query, Key, Value):**\n\nHow do modern LLMs (like GPT and Gemini) understand long sentences?\n\nImagine you are researching in a vast library:\n1. **Query ($Q$):** What you are searching for! (e.g., *"What does 'it' refer to in this sentence?"*).\n2. **Key ($K$):** The label or title printed on every book's spine on the shelves.\n3. **Attention Score ($Q \\cdot K^T$):** Comparing your Query against every Key via dot-product. The closer the match, the higher the score!\n4. **Softmax:** Turns those scores into percentage weights that add up to 100%.\n5. **Value ($V$):** The actual contents inside the books. You combine the values proportionally to their attention weights!\n\n$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V$$\n\nBecause every word can look directly at every other word in parallel, Transformers conquer language without slow sequential loops!`,

      snippet: `\`\`\`python
import torch
import torch.nn.functional as F

# 3 word tokens, each with an embedding dimension of 4
# Sequence: ["The", "robot", "moved"]
tokens = torch.tensor([
    [1.0, 0.0, 0.5, 0.2],  # The
    [0.1, 2.0, 1.5, 0.8],  # robot
    [0.5, 0.8, 2.2, 1.0]   # moved
])

# For simplicity, assume Q = K = V = tokens
Q = K = V = tokens
d_k = Q.size(-1)  # 4

# 1. Compute raw attention scores: Q · K^T
scores = torch.matmul(Q, K.transpose(-2, -1)) / (d_k ** 0.5)

# 2. Softmax along rows yields attention weights (probabilities)
attn_weights = F.softmax(scores, dim=-1)

# 3. Contextual output representations
out = torch.matmul(attn_weights, V)

print("Attention Matrix (3x3 weights):")
print(attn_weights.round(decimals=3))
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: The Scaled Dot-Product Factor**\n\nIn the attention equation, why do we divide $Q K^T$ by $\\sqrt{d_k}$?",
        options: [
          "A) To convert the matrices to integer format",
          "B) To prevent large dot products from pushing softmax into regions with vanishingly small gradients",
          "C) Because the matrix rank is 4",
          "D) To enforce causality in autoregressive models"
        ],
        answer: "B",
        explanation: "Brilliant! For large embedding dimensions $d_k$, the variance of the dot product grows as $d_k$. Without scaling by $\\sqrt{d_k}$, extreme values push the softmax function into saturating regions where its gradient approaches zero!"
      }
    },

    'quest-8': {
      title: 'Tokenization, Embeddings & RoPE',
      eli10: `🔤 **The High-Dimensional Semantic GPS & Airport Barcode:**\n\nComputers have zero concept of alphabets, grammar, or human slang—they only calculate floating-point matrix multiplications!\n\n1. **Byte-Pair Encoding (BPE):** Words are broken into atomic subwords (e.g. *"unbelievable"* $\\to$ \`['un', 'believ', 'able']\`). This eliminates Out-Of-Vocabulary (OOV) crashes while keeping vocab sizes compact (~32k - 128k).\n2. **The Embedding Matrix ($V \\times d$):** Each token ID acts as an index into a high-dimensional dictionary (e.g., 4,096 dimensions in Llama 3). Words with related meanings cluster together geometrically: $$\\text{king} - \\text{man} + \\text{woman} \\approx \\text{queen}$$\n3. **Rotary Position Embeddings (RoPE):** Self-attention is permutation-invariant—it has no innate sense of word order! RoPE treats pairs of dimensions in Query and Key vectors as coordinates in the complex plane, rotating them by angle $m \\theta$. When multiplying Query and Key, absolute indices cancel out, leaving attention dependent purely on the relative token distance $(m - n)$!`,

      snippet: `\`\`\`python
import torch
import torch.nn as nn

# 1. Embedding lookup table (10,000 vocab, 8 dimensions)
emb = nn.Embedding(num_embeddings=10000, embedding_dim=8)

# Input token IDs for: ["Token", "ization", "powers", "AI"]
token_ids = torch.tensor([4291, 1324, 7820, 2045])
vectors = emb(token_ids)

# 2. Rotary Position Embedding 2D rotation
def apply_rope(x, pos):
    angle = pos / (10000.0 ** 0.0)
    cos_a, sin_a = torch.cos(angle), torch.sin(angle)
    x0, x1 = x[..., 0], x[..., 1]
    return torch.stack([x0 * cos_a - x1 * sin_a, x0 * sin_a + x1 * cos_a], dim=-1)

pos = torch.arange(len(token_ids), dtype=torch.float32)
rotated = apply_rope(vectors[:, :2], pos)

print("Dense Vectors Shape:", vectors.shape)
print("RoPE Rotated Coordinates (first 2 dims):")
print(rotated.detach().round(decimals=3).numpy())
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: Byte-Pair Encoding (BPE)**\n\nWhy do modern LLMs use BPE subwords instead of storing every English whole word in a giant dictionary?",
        options: [
          "A) Because whole words take up too much physical RAM on SSDs",
          "B) To prevent Out-Of-Vocabulary (OOV) crashes on rare words or typos, while keeping vocabulary size compact (~32k to 128k)",
          "C) Because attention can only process syllables, not letters",
          "D) To convert text into audio waveforms"
        ],
        answer: "B",
        explanation: "Osu! Whole-word dictionaries explode to millions of words and crash on rare words or slang. BPE decomposes unseen words into known subword roots, suffixes, and prefixes!"
      }
    },

    'quest-9': {
      title: 'Transformer Decoder Block & GPT Architecture',
      eli10: `🧱 **The High-Speed Conveyor Belt & Assembly Line (Inside the GPT Block):**\n\nHow do modern LLMs like GPT-4, Llama 3, and Claude generate text without gradients vanishing across 80+ layers?\n\n1. **The Causal Mask:** During generation, when predicting word 4, the model must NOT look at word 5, 6, 7. Setting the upper triangle of attention to $-\\infty$ ensures that $e^{-\\infty} = 0\\%$, blinding future tokens completely!\n2. **The Residual Highway:** Gradients sprint backward through $x + \\mathcal{F}(x)$ via the identity matrix $\\mathbf{I}$, preventing vanishing gradients even across 100 deep layers.\n3. **RMSNorm:** Modern LLMs dropped mean-centering ($x - \\mu$) from LayerNorm and only scale by root-mean-square variance, saving ~20% GPU memory overhead.\n4. **SwiGLU FFN:** While attention routes information between tokens, the SwiGLU Feed-Forward Network serves as an associative factual memory store for world knowledge.\n5. **KV Caching:** Past Keys and Values are kept in GPU memory so the model only calculates the single newest token's Query vector, turning $O(N^2)$ inference into lightning-fast $O(N)$ streaming!`,

      snippet: `\`\`\`python
import torch
import torch.nn as nn
import torch.nn.functional as F

class RMSNorm(nn.Module):
    def __init__(self, dim, eps=1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))
    def forward(self, x):
        # Scale by Root Mean Square variance
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps) * self.weight

class SwiGLU(nn.Module):
    def __init__(self, d_model, d_ff):
        super().__init__()
        self.w_gate = nn.Linear(d_model, d_ff, bias=False)
        self.w_up = nn.Linear(d_model, d_ff, bias=False)
        self.w_down = nn.Linear(d_ff, d_model, bias=False)
    def forward(self, x):
        # Swish(xW_gate) * xW_up projected back down
        return self.w_down(F.silu(self.w_gate(x)) * self.w_up(x))

norm = RMSNorm(dim=64)
ffn = SwiGLU(d_model=64, d_ff=172)
x = torch.randn(1, 5, 64)
out = x + ffn(norm(x))  # Residual addition
print("Output context tensor shape:", out.shape)
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: Causal Masking in Auto-regressive LLMs**\n\nWhat would happen if an auto-regressive model was trained without a causal mask on the attention matrix?",
        options: [
          "A) Training would crash immediately with a division by zero error",
          "B) The model would cheat by looking ahead at the next token it is supposed to predict, making it useless for real text generation",
          "C) The model would generate text in reverse order",
          "D) Memory consumption would decrease by 90%"
        ],
        answer: "B",
        explanation: "Spot on! Without causal masking, token i would simply copy token i+1 from the future. The training loss would drop to zero, but the model would never learn to generate or predict!"
      }
    },

    'quest-10': {
      title: 'The Generation Engine: Temperature & Top-P Sampling',
      eli10: `🎲 **The Fortune Wheel & The Jazz Improviser (Generation & Sampling):**\n\nHow does an LLM turn raw numbers into engaging natural prose?\n\n1. **Logits ($z \\in \\mathbb{R}^V$):** The un-embedding projection produces an unconstrained score for all 128,000 words in the vocabulary.\n2. **The Temperature Dial ($T > 0$):** Modulates the entropy of Softmax:\n   $$P(w_i \\mid T) = \\frac{\\exp(z_i / T)}{\\sum_j \\exp(z_j / T)}$$\n   - **Cold ($T < 0.3$):** Softmax spikes into an Argmax spike. 100% deterministic, best for code and math, but prone to repetitive loops.\n   - **Balanced ($T \\approx 0.7$):** Natural human-like phrasing.\n   - **Hot ($T > 1.5$):** Flattened uniform distribution, resulting in hallucinated nonsense!\n3. **Top-P (Nucleus) Sampling:** Slices the cumulative probability mass (e.g. top 90%). When the model is confident, it shrinks to 1 token; when creative, it widens to dozens of options!\n4. **Repetition Penalty:** Divides the logits of recent words by $\\alpha > 1.0$, preventing runaway echo-chamber loops like *"and then and then and then"*!`,

      snippet: `\`\`\`python
import torch
import torch.nn.functional as F

def sample_token(logits, temperature=0.7, top_p=0.9):
    # 1. Scale logits by Temperature
    scaled = logits / max(temperature, 1e-4)
    probs = F.softmax(scaled, dim=-1)
    
    # 2. Top-P (Nucleus) cumulative cutoff
    sorted_probs, sorted_indices = torch.sort(probs, descending=True)
    cum_probs = torch.cumsum(sorted_probs, dim=-1)
    
    # Mask out tokens beyond cumulative threshold p
    mask = cum_probs > top_p
    mask[..., 1:] = mask[..., :-1].clone()
    mask[..., 0] = False
    sorted_probs[mask] = 0.0
    probs = sorted_probs / sorted_probs.sum(dim=-1, keepdim=True)
    
    # 3. Multinomial sample
    sample = torch.multinomial(probs, num_samples=1)
    return sorted_indices.gather(-1, sample).item()

# Raw candidate logits for: ["alien", "glowing", "city", "sandwich"]
raw = torch.tensor([4.2, 3.7, 3.3, 0.4])
chosen_idx = sample_token(raw, temperature=0.7, top_p=0.85)
print("Sampled token index:", chosen_idx)
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: The Temperature Parameter**\n\nWhat happens mathematically to the Softmax distribution when Temperature approaches zero (T → 0)?",
        options: [
          "A) All tokens receive equal 25% probability",
          "B) The distribution spikes into an Argmax Dirac delta where the highest logit receives 100% probability mass",
          "C) The model deletes all nouns from the vocabulary",
          "D) Memory consumption increases by 10x"
        ],
        answer: "B",
        explanation: "Osu! When dividing logits by a near-zero number, differences magnify toward infinity. Softmax turns into an exact Argmax, making next-token prediction 100% deterministic (greedy decoding)!"
      }
    },

    'quest-11': {
      title: 'Post-Training & Alignment: SFT, ChatML & DPO',
      eli10: `🛡️ **The Wild Horse & The Diplomat (Post-Training & DPO Alignment):**\n\nHow do we turn a raw next-token predictor that swallowed the entire internet into a polite, helpful assistant like ChatGPT or Claude?\n\n1. **Pre-Training vs Post-Training:** Pre-training creates raw encyclopedic memory through next-token prediction. It doesn't know it's an assistant! Post-training shapes that knowledge through two stages: SFT and Alignment.\n2. **Supervised Fine-Tuning (SFT):** Natural dialogue is serialized with ChatML special tokens: \`<|im_start|>user\` and \`<|im_start|>assistant\`. PyTorch masks the loss on user prompts (loss = -100) so the model only learns how to answer!\n3. **Direct Preference Optimization (DPO):** Traditional RLHF required training a separate Reward Model and running unstable PPO reinforcement learning with 4 models in GPU memory. DPO (Rafailov et al., 2023) derives the exact optimal policy mathematically in closed form:\n   $$\\mathcal{L}_{\\text{DPO}} = -\\log \\sigma \\left( \\beta \\log \\frac{\\pi_\\theta(y_w)}{\\pi_{\\text{ref}}(y_w)} - \\beta \\log \\frac{\\pi_\\theta(y_l)}{\\pi_{\\text{ref}}(y_l)} \\right)$$\n4. **Implicit Reward ($r_\\theta$):** $r(x, y) = \\beta (\\log \\pi_\\theta(y|x) - \\log \\pi_{\\text{ref}}(y|x))$. The parameter $\\beta$ acts as a KL anchor so the model never drifts away from its foundational common sense!`,

      snippet: `\`\`\`python
import torch
import torch.nn.functional as F

def compute_dpo_loss(pol_win, pol_lose, ref_win, ref_lose, beta=0.1):
    # 1. Compute policy vs reference log likelihood ratios
    pi_ratios = pol_win - pol_lose
    ref_ratios = ref_win - ref_lose
    
    # 2. Implicit reward margin between winner (y_w) and loser (y_l)
    logits = beta * (pi_ratios - ref_ratios)
    
    # 3. DPO Loss: -log(sigmoid(logits))
    loss = -F.logsigmoid(logits).mean()
    
    # 4. Implicit rewards for monitoring
    r_win = (beta * (pol_win - ref_win)).mean().item()
    r_lose = (beta * (pol_lose - ref_lose)).mean().item()
    return loss, r_win, r_lose

# Simulated log-probabilities for: Helpful response vs Rogue response
pol_w, pol_l = torch.tensor([-8.2]), torch.tensor([-16.4])
ref_w, ref_l = torch.tensor([-9.8]), torch.tensor([-12.1])

loss, r_win, r_lose = compute_dpo_loss(pol_w, pol_l, ref_w, ref_l, beta=0.1)
print(f"DPO Loss: {loss.item():.4f}, Margin: {r_win - r_lose:+.3f}")
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: Direct Preference Optimization (DPO)**\n\nWhat major advantage did DPO introduce over traditional PPO-based RLHF?",
        options: [
          "A) It eliminates the need to train a separate Reward Model and Actor-Critic RL loop by mathematically optimizing the policy directly from reference log-ratios",
          "B) It only works on 8-bit quantized models",
          "C) It replaces the Transformer architecture with linear regression",
          "D) It deletes all safety guardrails from the model"
        ],
        answer: "A",
        explanation: "Osu! Rafailov et al. (2023) showed that under the Bradley-Terry preference model, the ground-truth optimal reward can be extracted directly from policy and reference log-probabilities, eliminating the unstable reward model and PPO loop!"
      }
    },

    'quest-12': {
      title: 'Parameter-Efficient Fine-Tuning: LoRA & QLoRA',
      eli10: `🎛️ **The Masterpiece Canvas & The Transparent Acetate Overlay (LoRA & QLoRA):**\n\nHow do we teach a 70-billion-parameter LLM new skills on a consumer desktop GPU without blowing up our VRAM?\n\n1. **The VRAM Wall:** When you train all weights (Full Fine-Tuning), you must store 16-bit weights, 16-bit gradients, and 32-bit Adam optimizer states ($m_t$ and $v_t$). An 8B model requires **>72GB of VRAM**, demanding $30,000 datacenter clusters!\n2. **The Intrinsic Rank Hypothesis:** During task adaptation, weight updates ($\\Delta W$) have very low \"intrinsic dimension\". Instead of modifying $d_{\\text{out}} \\times d_{\\text{in}}$ matrix elements directly, we decompose it into two tiny bottleneck matrices:\n   $$\\Delta W = B \\times A \\quad \\text{where } A \\in \\mathbb{R}^{r \\times d_{\\text{in}}}, \\; B \\in \\mathbb{R}^{d_{\\text{out}} \\times r}, \\; r \\ll d$$\n3. **Forward Pass & Scaling:**\n   $$h = W_0 x + \\frac{\\alpha}{r} (B \\times A) x$$\n   - Base weights $W_0$ remain **100% frozen** (zero optimizer states!).\n   - Matrix $A$ is initialized with Gaussian noise (Kaiming).\n   - Matrix $B$ is initialized to **strictly ZERO** ($\\mathbf{0}$), ensuring $\\Delta W = 0$ at step 0 so the model behaves identically to the base LLM until training begins!\n4. **QLoRA Quantization:** Compresses the frozen base model to **4-bit NormalFloat (NF4)**, adds Double Quantization (saving 0.37 bits/param), and Paged Optimizers (paging memory spikes to CPU RAM), enabling a 70B LLM to be fine-tuned on a single 48GB GPU!`,

      snippet: `\`\`\`python
import torch
import torch.nn as nn
import math

class LoRALinear(nn.Module):
    def __init__(self, in_features, out_features, rank=8, alpha=16, dropout=0.05):
        super().__init__()
        # 1. Frozen base linear projection (W0)
        self.base = nn.Linear(in_features, out_features, bias=False)
        self.base.weight.requires_grad = False
        
        # 2. Low-rank trainable adapters: A (down) and B (up)
        self.lora_A = nn.Parameter(torch.empty(rank, in_features))
        self.lora_B = nn.Parameter(torch.zeros(out_features, rank))  # Zero init!
        nn.init.kaiming_uniform_(self.lora_A, a=math.sqrt(5))
        
        self.scaling = alpha / rank
        self.dropout = nn.Dropout(p=dropout)
        
    def forward(self, x):
        # Dual-branch forward: W0(x) + (alpha/r) * B(A(dropout(x)))
        base_out = self.base(x)
        lora_delta = (self.dropout(x) @ self.lora_A.T) @ self.lora_B.T
        return base_out + lora_delta * self.scaling

layer = LoRALinear(4096, 4096, rank=8, alpha=16)
frozen_p = sum(p.numel() for p in layer.parameters() if not p.requires_grad)
trainable_p = sum(p.numel() for p in layer.parameters() if p.requires_grad)
print(f"Frozen Base: {frozen_p:,} | Trainable LoRA: {trainable_p:,} ({trainable_p/frozen_p*100:.2f}%)")
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: LoRA Matrix Initialization**\n\nWhy is LoRA adapter matrix B initialized to all zeros (zeros_), while matrix A is initialized with random Gaussian noise?",
        options: [
          "A) Because Python sets variables to 0 by default",
          "B) So that ΔW = B × A = 0 at step 0, preserving the base model's exact initial capabilities before fine-tuning starts",
          "C) To prevent division by zero in Softmax",
          "D) To save VRAM on the GPU"
        ],
        answer: "B",
        explanation: "Osu! If B was initialized randomly, B × A would add random noise to the model's pre-trained weights at step 0, immediately destroying its reasoning capabilities. Zero-initializing B guarantees that ΔW starts at exactly zero!"
      }
    },

    'quest-13': {
      title: 'Reasoning Models & Test-Time Compute: DeepSeek-R1 & GRPO',
      eli10: `🧠 **The Chess Grandmaster & The Internal Scratchpad (Reasoning Models & GRPO):**\n\nHow do we turn a quick-guessing text predictor into a brilliant problem-solver capable of winning Math Olympiad medals?\n\n1. **System 1 vs System 2 Thinking:** Standard LLMs guess the next token instantly with zero pause (System 1). Across a 15-step deduction, even a 5% error per step leads to $(0.95)^{15} \\approx 46\\%$ accuracy! Reasoning models use System 2: spending test-time compute to generate an internal Chain-of-Thought (\`<think> ... </think>\`) to explore, verify, and deliberate before committing to an answer.\n2. **Self-Correction & Backtracking:** When a reasoning model reaches a logical contradiction, it writes: *"Wait, that yields an impossible result. Let me re-examine Step 2..."* and backtracks down an alternative solution branch!\n3. **Outcome vs. Process Supervision (ORMs vs PRMs):** Outcome Reward Models only grade the final answer (+1 or 0), giving zero credit assignment on which specific line was flawed. Process Reward Models (PRMs) grade *every single deduction step* ($r_t \\in [0, 1]$), pinpointing the exact moment logic derailed.\n4. **DeepSeek-R1 GRPO (Group Relative Policy Optimization):** Traditional PPO RL requires a massive Critic/Value model taking up hundreds of GBs of VRAM. GRPO samples a group of $G$ rollouts for prompt $q$ and normalizes advantages directly across the group:\n   $$A_i = \\frac{R_i - \\text{mean}(R)}{\\text{std}(R)}$$\n   Achieving superhuman mathematical reasoning with **0 Critic models in GPU memory**!`,

      snippet: `\`\`\`python
import torch
import torch.nn.functional as F

def compute_grpo_loss(policy_logps, old_logps, ref_logps, rewards, epsilon=0.2, beta=0.04):
    # 1. Normalize rewards across group of G completions (No Critic network!)
    mean_r = rewards.mean()
    std_r = rewards.std() + 1e-8
    advantages = (rewards - mean_r) / std_r
    
    # 2. Clipped surrogate objective
    ratio = torch.exp(policy_logps - old_logps)
    surr1 = ratio * advantages.unsqueeze(-1)
    surr2 = torch.clamp(ratio, 1.0 - epsilon, 1.0 + epsilon) * advantages.unsqueeze(-1)
    policy_loss = -torch.min(surr1, surr2).mean()
    
    # 3. KL reference anchor
    kl_div = torch.exp(ref_logps - policy_logps) - (ref_logps - policy_logps) - 1.0
    return policy_loss + beta * kl_div.mean(), advantages

# Group of G=4 rollouts: 2 correct (1.0), 1 wrong (0.0), 1 partial (0.2)
rewards = torch.tensor([1.0, 0.0, 1.0, 0.2])
pol = torch.tensor([[-0.2], [-1.8], [-0.3], [-0.9]])
old = torch.tensor([[-0.25], [-1.7], [-0.35], [-0.85]])
ref = torch.tensor([[-0.22], [-1.6], [-0.32], [-0.88]])

loss, adv = compute_grpo_loss(pol, old, ref, rewards)
print("Group Advantages:", adv.tolist())
print(f"GRPO Loss: {loss.item():.4f} (0 Critic VRAM overhead!)")
\`\`\``,

      quiz: {
        question: "🥋 **Dojo Pop Quiz: DeepSeek-R1 GRPO**\n\nHow does Group Relative Policy Optimization (GRPO) eliminate the need for a separate Critic / Value network in GPU memory?",
        options: [
          "A) It samples a group of G rollouts for the same prompt and normalizes advantages directly from group mean and standard deviation: A_i = (R_i - mean(R)) / std(R)",
          "B) It runs all calculations on CPU floating point chips",
          "C) It replaces deep learning with binary search trees",
          "D) It discards all reward feedback"
        ],
        answer: "A",
        explanation: "Osu! In traditional PPO, a Critic network estimates state value V(s). GRPO samples G rollouts for the same question and uses the group average as the baseline, saving over 50% GPU memory!"
      }
    }
  },

  // --- GENERAL TOPICS & FREQUENTLY ASKED QUESTIONS ---
  general: [
    {
      keywords: ['who are you', 'what is this', 'sensei', 'dojo', 'hello', 'hi', 'hey', 'greetings'],
      response: `🥋 **Osu! Welcome to the Sensei Tensor Dojo!**\n\nI am **Sensei Tensor** 🧠, your interactive Deep Learning mentor. My mission is to guide you from biological perceptrons to deep convolutional vision and transformer attention mechanisms.\n\n### 🧭 How I can help you right now:\n- **Explain any concept:** Ask *"Why do we need bias?"*, *"Explain ReLU"*, or *"How does backprop work?"*\n- **Provide runnable PyTorch code:** Ask *"Show me how to train a CNN"* or *"How to write a custom loss function?"*\n- **Test your mastery:** Ask *"Quiz me (+XP)"* to earn Dojo honor and XP!\n- **Simulate & Spar:** Click any preset prompt chip below based on your active Quest!`
    },
    {
      keywords: ['why bias', 'bias term', 'what is bias', 'purpose of bias'],
      response: `⚖️ **Why Neural Networks Absolutely Require a Bias Term ($b$):**\n\nThink of a linear function: $y = w \\cdot x + b$.\n\n1. **Without bias ($b=0$):** Every line, plane, or hyperplane is forced to pass directly through the origin $(0, 0)$. No matter how you twist the weight knob $w$, if $x=0$, $y$ MUST be 0!\n2. **With bias ($b \\neq 0$):** The line can shift freely up, down, left, or right anywhere in space!\n\n### 🏠 The Real-World Metaphor:\nImagine predicting house prices based on square footage ($x$). If square footage is 0, is the lot price always $0? No! The land itself has a base cost—that baseline is the **bias**!\n\n$$\\text{Output} = \\sum_{i} (w_i x_i) + b$$\n\nWithout bias, a network cannot model scenarios where zero input requires a non-zero reaction!`
    },
    {
      keywords: ['loss function', 'cross entropy', 'mse', 'difference between mse and cross entropy'],
      response: `🎯 **MSE vs. Cross-Entropy Loss: When to Use Which?**\n\n1. **Mean Squared Error (MSE):**\n   - Formula: $\\text{MSE} = \\frac{1}{N} \\sum (y - \\hat{y})^2$\n   - **Use Case:** **Regression problems** (predicting continuous real numbers like house prices, temperature, coordinates).\n   - **Drawback for classification:** Gives tiny gradients when combined with Sigmoid/Softmax.\n\n2. **Cross-Entropy Loss (Log Loss):**\n   - Formula: $\\text{CE} = -\\sum y_i \\log(\\hat{y}_i)$\n   - **Use Case:** **Classification problems** (predicting categories like Cat vs. Bicycle vs. Star in Quest 4).\n   - **Superpower:** Heavily penalizes high-confidence mistakes! If the network is 99% confident an image is a Cat, but the label is Bicycle, $-\\log(0.01) \\approx 4.6$ creates a massive gradient that forces rapid learning!`
    },
    {
      keywords: ['learning rate', 'too high', 'too low', 'schedule', 'adam', 'sgd'],
      response: `⚡ **The Learning Rate (Step Size $\\eta$):**\n\nThe learning rate dictates how aggressively weights are updated in each gradient descent step:\n\n$$w_{new} = w_{old} - \\eta \\cdot \\frac{\\partial L}{\\partial w}$$\n\n- **Too High ($\eta > 0.5$):** The optimizer overshoots the minimum, oscillations grow, and the loss explodes to \`NaN\`!\n- **Too Low ($\eta < 10^{-5}$):** The network crawls like a snail and gets trapped in shallow local plateaus.\n- **Modern Standard (Adam / AdamW with $\\eta = 0.001 - 0.0003$):** Adam computes adaptive, per-parameter learning rates with momentum, smoothing out the descent automatically!`
    },
    {
      keywords: ['vanishing gradient', 'exploding gradient', 'why relu over sigmoid'],
      response: `🕳️ **The Vanishing Gradient Problem (Why ReLU Saved Deep Learning):**\n\nIn the 1990s, everyone used **Sigmoid** activations. The derivative of Sigmoid has a maximum value of only $0.25$:\n\n$$\\sigma'(x) = \\sigma(x)(1 - \\sigma(x)) \\le 0.25$$\n\nWhen backpropagating through a 10-layer network, the chain rule multiplies these tiny derivatives together:\n$$0.25 \\times 0.25 \\times 0.25 \\times \\dots \\approx 0.00000095$$\n\nBy the time the gradient reached early layers, it **vanished to zero**! Early layers never learned.\n\n### 💡 The ReLU Revolution:\n$$\\text{ReLU}(x) = \\max(0, x), \\quad \\text{Derivative} = \\begin{cases} 1 & \\text{if } x > 0 \\\\ 0 & \\text{if } x < 0 \\end{cases}$$\n\nFor all positive activations, the gradient is **exactly 1.0**! No matter how deep your network is, $1 \\times 1 \\times 1 = 1$, gradients flow without vanishing!`
    },
    {
      keywords: ['pytorch', 'tensor', 'gpu', 'cuda', 'cpu'],
      response: `🐍 **What is a PyTorch Tensor?**\n\nA PyTorch **Tensor** is a multi-dimensional array (like a NumPy \`ndarray\`), but with two transformative superpowers:\n\n1. **Hardware Acceleration:** Can seamlessly run on GPUs (CUDA/MPS) with thousands of parallel arithmetic cores for $50\\times$ faster matrix multiplications.\n2. **Automatic Differentiation (\`Autograd\`):** By setting \`requires_grad=True\`, PyTorch tracks the computational graph of every math operation and automatically computes all partial derivatives when you call \`loss.backward()\`!\n\n\`\`\`python\nimport torch\n\nx = torch.tensor([2.0], requires_grad=True)\ny = x ** 3 + 4 * x\ny.backward()  # dy/dx = 3*x^2 + 4 = 3*(4) + 4 = 16\nprint(\"dy/dx:\", x.grad.item())  # 16.0\n\`\`\``
    }
  ]
};

/**
 * Searches the offline knowledge base for the best matching response.
 */
export function queryDojoKnowledge(userPrompt, questContext = null) {
  const p = userPrompt.toLowerCase().trim();
  const questId = questContext?.id || 'quest-1';
  const questData = DOJO_KNOWLEDGE.quests[questId] || DOJO_KNOWLEDGE.quests['quest-1'];

  // Helper: word-boundary regex tester
  const hasWord = (term) => new RegExp('\\b' + term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(p);
  const hasPhrase = (phrase) => p.includes(phrase.toLowerCase());

  // 1. Direct prompt chips / intentions
  if (
    hasPhrase("explain like i'm 10") ||
    hasPhrase("explain like i am 10") ||
    hasPhrase("like i'm 10") ||
    hasPhrase("like i am 10") ||
    hasWord('eli5') ||
    hasWord('simplified') ||
    hasPhrase('simple terms') ||
    hasPhrase('metaphor')
  ) {
    return questData.eli10;
  }

  if (
    hasPhrase('code snippet') ||
    hasPhrase('python snippet') ||
    hasPhrase('show code') ||
    hasPhrase('python code') ||
    hasPhrase('show python') ||
    hasPhrase('pytorch snippet')
  ) {
    return `🐍 **Python Implementation for ${questData.title}:**\n\nHere is a clean, runnable snippet. You can test it directly in the **Python Lab** tab:\n\n${questData.snippet}\n\n*Click "▶ Run in Python Engine" to execute!*`;
  }

  if (
    hasPhrase('quiz me') ||
    hasPhrase('pop quiz') ||
    hasPhrase('give me a quiz') ||
    hasPhrase('test me') ||
    hasPhrase('challenge me')
  ) {
    const q = questData.quiz;
    return `${q.question}\n\n${q.options.join('\n')}\n\n*Reply with **A**, **B**, **C**, or **D** to test your knowledge!*`;
  }

  // 2. Check if user is replying to a quiz question (A, B, C, D)
  const isQuizAnswer = /^(option\s*)?([abcd])(\))?$/i.exec(p);
  if (isQuizAnswer) {
    const chosen = isQuizAnswer[2].toUpperCase();
    const q = questData.quiz;
    if (chosen === q.answer) {
      return `🎉 **CORRECT! (+30 XP EARNED!)**\n\n${q.explanation}\n\n🥋 Sensei Tensor praises your sharp intellect, Tensor Cadet! Try another quest prompt or explore the Playful Sandbox!`;
    } else {
      return `❌ **Not quite!** You selected **(${chosen})**, but the correct answer is **(${q.answer})**.\n\n${q.explanation}\n\n*Review the Concept Lesson tab to strengthen your foundation!*`;
    }
  }

  // 3. Match general deep learning FAQs with word boundaries
  for (const item of DOJO_KNOWLEDGE.general) {
    const matched = item.keywords.some(k => {
      if (k.length <= 3) return hasWord(k);
      return hasPhrase(k);
    });
    if (matched) {
      return item.response;
    }
  }

  // 4. Check other quests if mentioned specifically by number or keyword
  if (hasPhrase('percept') || hasPhrase('coffee') || hasPhrase('quest 1')) {
    return DOJO_KNOWLEDGE.quests['quest-1'].eli10;
  }
  if (hasPhrase('activation') || hasPhrase('relu') || hasPhrase('sigmoid') || hasPhrase('quest 2')) {
    return DOJO_KNOWLEDGE.quests['quest-2'].eli10;
  }
  if (hasPhrase('gradient') || hasPhrase('backprop') || hasPhrase('chain rule') || hasPhrase('quest 3')) {
    return DOJO_KNOWLEDGE.quests['quest-3'].eli10;
  }
  if (hasPhrase('cnn') || hasPhrase('convolution') || hasPhrase('doodle') || hasPhrase('quest 4')) {
    return DOJO_KNOWLEDGE.quests['quest-4'].eli10;
  }
  if (hasPhrase('kernel') || hasPhrase('sobel') || hasPhrase('filter') || hasPhrase('quest 5')) {
    return DOJO_KNOWLEDGE.quests['quest-5'].eli10;
  }
  if (hasPhrase('overfit') || hasPhrase('regulariz') || hasPhrase('dropout') || hasPhrase('quest 6')) {
    return DOJO_KNOWLEDGE.quests['quest-6'].eli10;
  }
  if (hasPhrase('attention') || hasPhrase('transformer') || hasPhrase('qkv') || hasPhrase('quest 7')) {
    return DOJO_KNOWLEDGE.quests['quest-7'].eli10;
  }
  if (hasPhrase('token') || hasPhrase('embedding') || hasPhrase('bpe') || hasPhrase('rope') || hasPhrase('subword') || hasPhrase('quest 8')) {
    return DOJO_KNOWLEDGE.quests['quest-8'].eli10;
  }
  if (hasPhrase('gpt') || hasPhrase('causal') || hasPhrase('rmsnorm') || hasPhrase('swiglu') || hasPhrase('decoder') || hasPhrase('kv cache') || hasPhrase('quest 9')) {
    return DOJO_KNOWLEDGE.quests['quest-9'].eli10;
  }
  if (hasPhrase('sampling') || hasPhrase('temperature') || hasPhrase('top-p') || hasPhrase('nucleus') || hasPhrase('greedy') || hasPhrase('logit') || hasPhrase('repetition') || hasPhrase('quest 10')) {
    return DOJO_KNOWLEDGE.quests['quest-10'].eli10;
  }
  if (hasPhrase('alignment') || hasPhrase('sft') || hasPhrase('dpo') || hasPhrase('rlhf') || hasPhrase('chatml') || hasPhrase('preference') || hasPhrase('reward') || hasPhrase('jailbreak') || hasPhrase('refusal') || hasPhrase('quest 11')) {
    return DOJO_KNOWLEDGE.quests['quest-11'].eli10;
  }
  if (hasPhrase('peft') || hasPhrase('lora') || hasPhrase('qlora') || hasPhrase('quantiz') || hasPhrase('low-rank') || hasPhrase('rank') || hasPhrase('adapter') || hasPhrase('nf4') || hasPhrase('quest 12')) {
    return DOJO_KNOWLEDGE.quests['quest-12'].eli10;
  }
  if (hasPhrase('reasoning') || hasPhrase('deepseek') || hasPhrase('r1') || hasPhrase('grpo') || hasPhrase('prm') || hasPhrase('orm') || hasPhrase('scratchpad') || hasPhrase('test-time') || hasPhrase('mcts') || hasPhrase('quest 13')) {
    return DOJO_KNOWLEDGE.quests['quest-13'].eli10;
  }

  // 5. Fallback context-rich synthesis based on active quest
  return `🥋 **Sensei Tensor Dojo Insight on ${questData.title}:**\n\nRegarding your inquiry: *"__${userPrompt}__"*\n\n${questData.eli10}\n\n### 🐍 Runnable Python Snippet:\n${questData.snippet}\n\n💡 *Tip: You can ask for a pop quiz by clicking "🎯 Quiz Me (+XP)" below!*`;
}
