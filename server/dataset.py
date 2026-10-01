import numpy as np
import torch
from torch.utils.data import TensorDataset, DataLoader

def generate_synthetic_doodle_data(samples_per_class=120):
    """
    Generates synthetic 28x28 doodle stroke patterns for 5 classes:
    0: Cat (circles with two top triangle ears)
    1: Bicycle (two distinct round wheels and top connecting frame)
    2: Star (5-pointed star lines radiating from center)
    3: Pizza (triangle wedge with circular pepperoni dots)
    4: Umbrella (curved dome arc with bottom straight hook handle)
    """
    np.random.seed(42)
    images = []
    labels = []

    for cls_idx in range(5):
        for _ in range(samples_per_class):
            canvas = np.zeros((28, 28), dtype=np.float32)
            noise = np.random.normal(0, 0.05, (28, 28)).astype(np.float32)
            
            if cls_idx == 0:  # Cat
                # Head circle
                y, x = np.ogrid[:28, :28]
                mask = ((x - 14)**2 + (y - 15)**2) < (7**2)
                inner = ((x - 14)**2 + (y - 15)**2) < (5**2)
                canvas[mask & ~inner] = 0.9
                # Left ear
                for i in range(5):
                    canvas[8 - i, 8 + i] = 0.9
                    canvas[8 - i, 8 - i] = 0.9
                # Right ear
                for i in range(5):
                    canvas[8 - i, 20 + i] = 0.9
                    canvas[8 - i, 20 - i] = 0.9

            elif cls_idx == 1:  # Bicycle
                # Left wheel
                y, x = np.ogrid[:28, :28]
                w1 = ((x - 7)**2 + (y - 20)**2) < (4**2)
                w1_in = ((x - 7)**2 + (y - 20)**2) < (2**2)
                canvas[w1 & ~w1_in] = 0.9
                # Right wheel
                w2 = ((x - 21)**2 + (y - 20)**2) < (4**2)
                w2_in = ((x - 21)**2 + (y - 20)**2) < (2**2)
                canvas[w2 & ~w2_in] = 0.9
                # Frame lines
                for t in range(7, 22):
                    canvas[20, t] = 0.9
                    if 10 <= t <= 17:
                        canvas[12, t] = 0.9

            elif cls_idx == 2:  # Star
                # 5-pointed star lines radiating from (14, 14)
                for r in range(2, 10):
                    canvas[14 - r, 14] = 0.9 # Top
                    canvas[14 + int(r*0.8), 14 - int(r*0.6)] = 0.9 # Bottom left
                    canvas[14 + int(r*0.8), 14 + int(r*0.6)] = 0.9 # Bottom right
                    canvas[14 - int(r*0.3), 14 - int(r*0.9)] = 0.9 # Top left
                    canvas[14 - int(r*0.3), 14 + int(r*0.9)] = 0.9 # Top right

            elif cls_idx == 3:  # Pizza
                # Triangle slice pointing down
                for row in range(5, 23):
                    width = int((23 - row) * 0.7)
                    if 14 - width >= 0 and 14 + width < 28:
                        canvas[row, 14 - width] = 0.9
                        canvas[row, 14 + width] = 0.9
                # Crust
                canvas[5, 4:24] = 0.9
                # Pepperoni dots
                canvas[10, 14] = 0.9
                canvas[15, 12] = 0.9
                canvas[15, 16] = 0.9

            elif cls_idx == 4:  # Umbrella
                # Arc dome
                y, x = np.ogrid[:28, :28]
                dome = (((x - 14)**2 + (y - 12)**2) < (10**2)) & (y <= 12)
                inner_dome = (((x - 14)**2 + (y - 12)**2) < (8**2)) & (y <= 12)
                canvas[dome & ~inner_dome] = 0.9
                canvas[12, 4:25] = 0.9
                # Handle
                canvas[12:24, 14] = 0.9
                # Hook
                canvas[24, 11:15] = 0.9
                canvas[23, 11] = 0.9

            # Add jitter & clip
            sample = np.clip(canvas + noise, 0.0, 1.0)
            images.append(sample[np.newaxis, :, :]) # [1, 28, 28]
            labels.append(cls_idx)

    X = torch.tensor(np.array(images), dtype=torch.float32)
    y = torch.tensor(labels, dtype=torch.long)
    return TensorDataset(X, y)
