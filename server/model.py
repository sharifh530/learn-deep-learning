import torch
import torch.nn as nn
import torch.nn.functional as F

CLASS_NAMES = ["Cat 🐱", "Bicycle 🚲", "Star ⭐", "Pizza 🍕", "Umbrella ☂️"]

class DoodleCNN(nn.Module):
    """
    Convolutional Neural Network for QuickDraw 28x28 grayscale doodle classification.
    Simple, elegant architecture ideal for learners to inspect:
    Conv2D -> ReLU -> MaxPool2D -> Conv2D -> ReLU -> MaxPool2D -> Linear -> Linear
    """
    def __init__(self, num_classes=5):
        super().__init__()
        # Conv block 1: 1 channel in (grayscale), 16 feature maps out, 3x3 filter
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, padding=1)
        self.pool1 = nn.MaxPool2d(2, 2) # 28x28 -> 14x14
        
        # Conv block 2: 16 channels in, 32 feature maps out, 3x3 filter
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.pool2 = nn.MaxPool2d(2, 2) # 14x14 -> 7x7
        
        # Dense classification head
        self.fc1 = nn.Linear(32 * 7 * 7, 64)
        self.dropout = nn.Dropout(0.25)
        self.fc2 = nn.Linear(64, num_classes)

    def forward(self, x):
        # x shape: [batch_size, 1, 28, 28]
        x = self.pool1(F.relu(self.conv1(x)))
        x = self.pool2(F.relu(self.conv2(x)))
        x = torch.flatten(x, 1) # Flatten to 32 * 7 * 7 = 1568
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        logits = self.fc2(x)
        return logits

def get_feature_maps(model, x_tensor):
    """Returns intermediate feature maps after conv1 for visual debugging/learning."""
    with torch.no_grad():
        c1 = F.relu(model.conv1(x_tensor))
        return c1.squeeze(0).cpu().numpy()
