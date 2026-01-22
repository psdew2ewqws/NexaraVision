# Quick Implementation Guide - 93-95% Accuracy Roadmap

**Goal**: Improve from 87% → 93-95% accuracy
**Timeline**: 2-3 weeks
**Investment**: $100-150 training costs

---

## Week 1: Quick Wins (Target: 91-93%)

### Day 1: Critical Fixes (87% → 90%)

#### 1. Focal Loss + Class Weights (30 minutes)

**File**: `/home/admin/Desktop/NexaraVision/violence_detection_mvp/src/focal_loss.py` (create new)

```python
"""Focal Loss for imbalanced violence detection."""
import tensorflow as tf
from tensorflow.keras import backend as K

class FocalLoss(tf.keras.losses.Loss):
    def __init__(self, alpha=0.7, gamma=2.0, label_smoothing=0.1):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.label_smoothing = label_smoothing

    def call(self, y_true, y_pred):
        # Label smoothing
        y_true = y_true * (1 - self.label_smoothing) + 0.5 * self.label_smoothing

        # Clip predictions
        epsilon = K.epsilon()
        y_pred = K.clip(y_pred, epsilon, 1.0 - epsilon)

        # Cross entropy
        cross_entropy = -y_true * K.log(y_pred) - (1 - y_true) * K.log(1 - y_pred)

        # Focal term
        p_t = tf.where(y_true == 1, y_pred, 1 - y_pred)
        focal_term = K.pow(1.0 - p_t, self.gamma)

        # Alpha weighting
        alpha_t = tf.where(y_true == 1, 1 - self.alpha, self.alpha)

        # Combine
        focal_loss = alpha_t * focal_term * cross_entropy
        return K.mean(focal_loss)
```

**Update training script**:
```python
from focal_loss import FocalLoss

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss=FocalLoss(alpha=0.7, gamma=2.0, label_smoothing=0.1),
    metrics=['accuracy', 'precision', 'recall', 'auc']
)
```

**Expected Gain**: +3-5% accuracy

---

#### 2. Cosine Annealing with Warmup (30 minutes)

**File**: `/home/admin/Desktop/NexaraVision/violence_detection_mvp/src/lr_schedulers.py` (create new)

```python
"""Learning rate schedulers for optimal training."""
import numpy as np
import tensorflow as tf

class CosineAnnealingWithWarmup(tf.keras.callbacks.Callback):
    def __init__(self, total_epochs=100, warmup_epochs=10,
                 initial_lr=0.0001, max_lr=0.001, min_lr=1e-6):
        super().__init__()
        self.total_epochs = total_epochs
        self.warmup_epochs = warmup_epochs
        self.initial_lr = initial_lr
        self.max_lr = max_lr
        self.min_lr = min_lr

    def on_epoch_begin(self, epoch, logs=None):
        if epoch < self.warmup_epochs:
            # Linear warmup
            lr = self.initial_lr + (self.max_lr - self.initial_lr) * \
                 (epoch / self.warmup_epochs)
        else:
            # Cosine annealing
            progress = (epoch - self.warmup_epochs) / \
                      (self.total_epochs - self.warmup_epochs)
            lr = self.min_lr + (self.max_lr - self.min_lr) * \
                 0.5 * (1 + np.cos(np.pi * progress))

        tf.keras.backend.set_value(self.model.optimizer.lr, lr)
```

**Update training script**:
```python
from lr_schedulers import CosineAnnealingWithWarmup

lr_scheduler = CosineAnnealingWithWarmup(
    total_epochs=100,
    warmup_epochs=10,
    initial_lr=0.0001,
    max_lr=0.001,
    min_lr=1e-6
)

history = model.fit(
    train_dataset,
    validation_data=val_dataset,
    epochs=100,
    callbacks=[lr_scheduler, early_stopping, checkpoint, ...]
)
```

**Expected Gain**: +2-3% accuracy

---

#### 3. Test-Time Augmentation (1 hour)

**File**: `/home/admin/Desktop/NexaraVision/violence_detection_mvp/src/tta.py` (create new)

```python
"""Test-Time Augmentation for robust predictions."""
import numpy as np
import tensorflow as tf

def augment_video(frames):
    """Apply augmentation to video frames."""
    # Random horizontal flip
    if tf.random.uniform(()) > 0.5:
        frames = tf.image.flip_left_right(frames)

    # Random brightness
    frames = tf.image.random_brightness(frames, max_delta=0.1)

    # Random contrast
    frames = tf.image.random_contrast(frames, lower=0.9, upper=1.1)

    return frames

def predict_with_tta(model, video, n_augmentations=5):
    """
    Predict with Test-Time Augmentation.

    Args:
        model: Trained model
        video: Input video (frames, height, width, channels)
        n_augmentations: Number of augmented predictions

    Returns:
        Averaged prediction
    """
    predictions = []

    # Original prediction
    predictions.append(model.predict(np.expand_dims(video, axis=0))[0])

    # Augmented predictions
    for _ in range(n_augmentations - 1):
        augmented = augment_video(video)
        pred = model.predict(np.expand_dims(augmented, axis=0))[0]
        predictions.append(pred)

    # Average
    return np.mean(predictions, axis=0)

# Usage in evaluation
from tta import predict_with_tta

for video, label in test_dataset:
    prediction = predict_with_tta(model, video, n_augmentations=5)
    # Evaluate
```

**Expected Gain**: +1.5-3% accuracy

---

#### 4. Update Configuration (5 minutes)

**File**: `/home/admin/Desktop/NexaraVision/config_rtx5000ada.py`

```python
# Add these parameters
# ============================================
# IMBALANCED DATA HANDLING
# ============================================
USE_FOCAL_LOSS = True
FOCAL_ALPHA = 0.7  # Weight minority class (non-violent)
FOCAL_GAMMA = 2.0
LABEL_SMOOTHING = 0.1

# Class-specific augmentation
VIOLENT_AUG_FACTOR = 2      # 2x augmentation for majority
NONVIOLENT_AUG_FACTOR = 10  # 10x for minority (INCREASED from current)

# Learning rate
LR_SCHEDULE = 'cosine_annealing_warmup'
WARMUP_EPOCHS = 10
INITIAL_LR = 0.0001
MAX_LR = 0.001
MIN_LR = 1e-6

# Test-Time Augmentation
TTA_ENABLED = True
TTA_N_AUGMENTATIONS = 5
```

---

### Day 2-3: First Training Run (90% → 92%)

**Command**:
```bash
cd /home/admin/Desktop/NexaraVision

# Train with all improvements
python violence_detection_mvp/src/train_advanced.py \
    --batch-size 128 \
    --epochs 100 \
    --augmentation full \
    --architecture optimal \
    --two-stage-training \
    --model-name violence_detector_focal_cosine_v1
```

**Monitor**:
```bash
# TensorBoard
tensorboard --logdir logs/

# Check progress
tail -f logs/violence_detector_focal_cosine_v1_training.csv
```

**Expected Results**:
- Epoch 10: ~85-88%
- Epoch 30: ~88-91%
- Epoch 60: ~90-93%
- Epoch 100: **91-93%** (with TTA)

---

### Day 4-5: Validation & Refinement (92% → 93%)

#### Add Random Rotation & Zoom

**File**: `/home/admin/Desktop/NexaraVision/violence_detection_mvp/src/train_advanced.py`

Find the `spatial_augmentation` function and add:

```python
@staticmethod
def spatial_augmentation(frame: np.ndarray, training: bool = True) -> np.ndarray:
    if not training:
        return frame

    frame = tf.cast(frame, tf.float32)

    # Existing augmentations...

    # NEW: Random rotation (±10 degrees)
    if tf.random.uniform(()) > 0.5:
        angle = tf.random.uniform((), minval=-10, maxval=10)
        frame = tfa.image.rotate(frame, angle * np.pi / 180)

    # NEW: Random zoom (0.85-1.15x)
    if tf.random.uniform(()) > 0.5:
        zoom_factor = tf.random.uniform((), minval=0.85, maxval=1.15)
        h, w = IMG_HEIGHT, IMG_WIDTH
        new_h, new_w = int(h * zoom_factor), int(w * zoom_factor)
        frame = tf.image.resize(frame, [new_h, new_w])
        frame = tf.image.resize_with_crop_or_pad(frame, h, w)

    frame = tf.clip_by_value(frame, 0.0, 255.0)
    return frame
```

**Expected Gain**: +1-2% accuracy

---

## Week 2: Alternative Backbones & Ensemble (Target: 93-95%)

### Day 6-8: Train ResNet50 Variant

#### Create ResNet50 Model

**File**: `/home/admin/Desktop/NexaraVision/violence_detection_mvp/src/models.py` (create new)

```python
"""Model architectures for violence detection."""
import tensorflow as tf
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import VGG19, ResNet50, EfficientNetB4
from tensorflow.keras.regularizers import l2

def create_model(backbone='VGG19', sequence_length=30, img_size=(224, 224)):
    """
    Create violence detection model with specified backbone.

    Args:
        backbone: 'VGG19', 'ResNet50', or 'EfficientNetB4'
        sequence_length: Number of frames
        img_size: Input image size

    Returns:
        model, feature_extractor
    """
    inputs = layers.Input(shape=(sequence_length, img_size[0], img_size[1], 3))

    # Select backbone
    if backbone == 'VGG19':
        base_model = VGG19(weights='imagenet', include_top=True,
                          input_shape=(*img_size, 3))
        feature_layer = 'fc2'
        feature_dim = 4096

    elif backbone == 'ResNet50':
        base_model = ResNet50(weights='imagenet', include_top=True,
                             input_shape=(*img_size, 3))
        feature_layer = 'avg_pool'
        feature_dim = 2048

    elif backbone == 'EfficientNetB4':
        base_model = EfficientNetB4(weights='imagenet', include_top=True,
                                    input_shape=(*img_size, 3))
        feature_layer = 'avg_pool'
        feature_dim = 1792

    # Feature extractor
    feature_extractor = Model(
        inputs=base_model.input,
        outputs=base_model.get_layer(feature_layer).output
    )
    feature_extractor.trainable = False

    # Extract features from each frame
    features = layers.TimeDistributed(feature_extractor)(inputs)
    features = layers.Dropout(0.5)(features)

    # Bi-LSTM with attention
    x = layers.Bidirectional(
        layers.LSTM(128, return_sequences=True, dropout=0.5,
                   recurrent_dropout=0.3, kernel_regularizer=l2(0.0001))
    )(features)
    x = layers.Bidirectional(
        layers.LSTM(128, return_sequences=True, dropout=0.5,
                   recurrent_dropout=0.3, kernel_regularizer=l2(0.0001))
    )(x)
    x = layers.Bidirectional(
        layers.LSTM(128, return_sequences=True, dropout=0.5,
                   recurrent_dropout=0.3, kernel_regularizer=l2(0.0001))
    )(x)

    # Multi-head attention
    attention = layers.MultiHeadAttention(
        num_heads=8, key_dim=256, dropout=0.3
    )(x, x)

    # Global pooling
    x = layers.GlobalAveragePooling1D()(attention)

    # Dense layers
    x = layers.Dense(256, activation='relu', kernel_regularizer=l2(0.0001))(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(128, activation='relu', kernel_regularizer=l2(0.0001))(x)
    x = layers.Dropout(0.5)(x)

    # Output
    outputs = layers.Dense(1, activation='sigmoid')(x)

    model = Model(inputs=inputs, outputs=outputs, name=f'{backbone}_violence_detector')

    return model, feature_extractor
```

**Train ResNet50**:
```bash
python violence_detection_mvp/src/train_advanced.py \
    --backbone ResNet50 \
    --batch-size 160 \
    --epochs 100 \
    --model-name violence_detector_resnet50_v1
```

**Expected**: 89-93% accuracy (lighter model, may be faster)

---

### Day 9-10: Train EfficientNet-B4 Variant

```bash
python violence_detection_mvp/src/train_advanced.py \
    --backbone EfficientNetB4 \
    --batch-size 96 \
    --epochs 100 \
    --model-name violence_detector_efficientnet_v1
```

**Expected**: 90-94% accuracy (good balance)

---

### Day 11-14: 3-Model Ensemble

**File**: `/home/admin/Desktop/NexaraVision/violence_detection_mvp/src/ensemble.py` (create new)

```python
"""Ensemble methods for violence detection."""
import numpy as np
import tensorflow as tf
from typing import List

class ViolenceDetectionEnsemble:
    """Ensemble of multiple violence detection models."""

    def __init__(self, model_paths: List[str]):
        """
        Args:
            model_paths: List of paths to trained models
        """
        self.models = [tf.keras.models.load_model(path) for path in model_paths]
        self.weights = None

    def predict(self, X, weights=None):
        """
        Ensemble prediction.

        Args:
            X: Input data
            weights: Model weights (None = equal weighting)

        Returns:
            Ensemble predictions
        """
        if weights is None:
            weights = np.ones(len(self.models)) / len(self.models)

        predictions = []
        for model in self.models:
            pred = model.predict(X)
            predictions.append(pred)

        # Weighted average
        ensemble_pred = np.average(predictions, axis=0, weights=weights)
        return ensemble_pred

    def optimize_weights(self, X_val, y_val):
        """
        Optimize ensemble weights on validation set.

        Args:
            X_val: Validation data
            y_val: Validation labels

        Returns:
            Optimized weights
        """
        from scipy.optimize import minimize

        # Get individual predictions
        predictions = [model.predict(X_val) for model in self.models]

        def loss(weights):
            # Ensure weights sum to 1
            weights = weights / np.sum(weights)
            ensemble_pred = np.average(predictions, axis=0, weights=weights)
            # Binary cross-entropy
            epsilon = 1e-7
            ensemble_pred = np.clip(ensemble_pred, epsilon, 1 - epsilon)
            bce = -np.mean(y_val * np.log(ensemble_pred) +
                          (1 - y_val) * np.log(1 - ensemble_pred))
            return bce

        # Optimize
        initial_weights = np.ones(len(self.models)) / len(self.models)
        bounds = [(0.0, 1.0)] * len(self.models)
        result = minimize(loss, initial_weights, bounds=bounds, method='L-BFGS-B')

        self.weights = result.x / np.sum(result.x)
        return self.weights

# Usage
ensemble = ViolenceDetectionEnsemble([
    'models/violence_detector_vgg19_best.h5',
    'models/violence_detector_resnet50_best.h5',
    'models/violence_detector_efficientnet_best.h5'
])

# Optimize weights on validation set
optimal_weights = ensemble.optimize_weights(X_val, y_val)
print(f"Optimal weights: {optimal_weights}")

# Predict on test set
test_predictions = ensemble.predict(X_test, weights=optimal_weights)
```

**Expected Results**: **93-95% accuracy** 🎯

---

## Week 3: Advanced Techniques (Stretch Goal: 95-97%)

### Two-Stream Architecture (RGB + Optical Flow)

#### Step 1: Extract Optical Flow

**File**: `/home/admin/Desktop/NexaraVision/violence_detection_mvp/src/optical_flow.py` (create new)

```python
"""Optical flow extraction for violence detection."""
import cv2
import numpy as np

def extract_optical_flow(video_path, num_frames=30):
    """
    Extract optical flow from video.

    Args:
        video_path: Path to video file
        num_frames: Number of flow frames to extract

    Returns:
        optical_flow: (num_frames, height, width, 2)
    """
    cap = cv2.VideoCapture(video_path)

    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        return None

    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
    flows = []

    while len(flows) < num_frames:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Calculate optical flow (Farneback method)
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, gray,
            None,
            pyr_scale=0.5,
            levels=3,
            winsize=15,
            iterations=3,
            poly_n=5,
            poly_sigma=1.2,
            flags=0
        )

        flows.append(flow)
        prev_gray = gray

    cap.release()

    # Pad if necessary
    while len(flows) < num_frames:
        flows.append(np.zeros_like(flows[0]))

    return np.array(flows[:num_frames])

def flow_to_rgb(flow):
    """Convert optical flow to RGB for visualization."""
    magnitude, angle = cv2.cartToPolar(flow[..., 0], flow[..., 1])

    # HSV representation
    hsv = np.zeros((flow.shape[0], flow.shape[1], 3), dtype=np.uint8)
    hsv[..., 0] = angle * 180 / np.pi / 2
    hsv[..., 1] = 255
    hsv[..., 2] = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX)

    rgb = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    return rgb
```

#### Step 2: Two-Stream Model

**File**: `/home/admin/Desktop/NexaraVision/violence_detection_mvp/src/two_stream_model.py` (create new)

```python
"""Two-stream architecture for violence detection."""
import tensorflow as tf
from tensorflow.keras import layers, Model
from models import create_model

def create_two_stream_model(sequence_length=30, img_size=(224, 224)):
    """
    Create two-stream model (RGB + Optical Flow).

    Returns:
        two_stream_model
    """
    # RGB stream
    rgb_input = layers.Input(shape=(sequence_length, img_size[0], img_size[1], 3),
                            name='rgb_input')
    rgb_model, _ = create_model(backbone='VGG19', sequence_length=sequence_length)
    rgb_features = rgb_model(rgb_input)

    # Optical flow stream
    flow_input = layers.Input(shape=(sequence_length, img_size[0], img_size[1], 2),
                             name='flow_input')
    # Convert 2-channel flow to 3-channel for VGG19
    flow_expanded = layers.TimeDistributed(
        layers.Conv2D(3, (1, 1), activation='relu')
    )(flow_input)
    flow_model, _ = create_model(backbone='VGG19', sequence_length=sequence_length)
    flow_features = flow_model(flow_expanded)

    # Fusion
    fused = layers.Concatenate()([rgb_features, flow_features])
    x = layers.Dense(256, activation='relu')(fused)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(1, activation='sigmoid')(x)

    two_stream_model = Model(
        inputs=[rgb_input, flow_input],
        outputs=outputs,
        name='two_stream_violence_detector'
    )

    return two_stream_model
```

**Expected Gain**: +5-8% accuracy (95-97% total)

---

## Monitoring & Validation

### Key Metrics Dashboard

```python
"""Evaluation script with comprehensive metrics."""
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

def evaluate_model(model, X_test, y_test, class_names=['Non-Violent', 'Violent']):
    """Comprehensive evaluation."""

    # Predictions
    y_pred_prob = model.predict(X_test)
    y_pred = (y_pred_prob > 0.5).astype(int)

    # Classification report
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=class_names))

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_names, yticklabels=class_names)
    plt.title('Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.savefig('confusion_matrix.png', dpi=300, bbox_inches='tight')

    # Per-class metrics
    print("\nPer-Class Accuracy:")
    for i, class_name in enumerate(class_names):
        class_mask = (y_test == i)
        class_acc = (y_pred[class_mask] == i).mean()
        print(f"{class_name}: {class_acc:.4f}")

    # Overall accuracy
    accuracy = (y_pred == y_test).mean()
    print(f"\nOverall Accuracy: {accuracy:.4f}")

    return {
        'accuracy': accuracy,
        'predictions': y_pred,
        'probabilities': y_pred_prob,
        'confusion_matrix': cm
    }
```

---

## Quick Reference: Training Commands

```bash
# Week 1: Quick wins baseline
python train_advanced.py --batch-size 128 --epochs 100 \
    --model-name violence_focal_v1

# Week 2: ResNet50
python train_advanced.py --backbone ResNet50 --batch-size 160 \
    --epochs 100 --model-name violence_resnet50_v1

# Week 2: EfficientNet-B4
python train_advanced.py --backbone EfficientNetB4 --batch-size 96 \
    --epochs 100 --model-name violence_efficientnet_v1

# Ensemble evaluation
python evaluate_ensemble.py \
    --models models/violence_*_best.h5 \
    --test-dir data/raw/rwf2000/test \
    --tta-augmentations 5
```

---

## Expected Timeline & Milestones

| Week | Day | Milestone | Accuracy | Status |
|------|-----|-----------|----------|--------|
| 1 | 1 | Focal loss + cosine annealing | - | Setup |
| 1 | 2-3 | First training run | 90-92% | Training |
| 1 | 4-5 | Validation + refinement | 91-93% | Validation |
| 2 | 6-8 | ResNet50 variant | 89-93% | Training |
| 2 | 9-10 | EfficientNet variant | 90-94% | Training |
| 2 | 11-14 | 3-model ensemble | **93-95%** | ✅ TARGET |
| 3 | 15-21 | Two-stream (optional) | 95-97% | Stretch |

---

## Troubleshooting

### Issue: Overfitting on minority class
**Symptom**: High training accuracy, low validation accuracy on non-violent
**Solution**:
- Reduce `NONVIOLENT_AUG_FACTOR` from 10 to 5-7
- Increase L2 regularization
- Use separate validation set from original distribution

### Issue: Label smoothing degrading performance
**Symptom**: Lower confidence, slightly worse accuracy
**Solution**:
- Reduce label smoothing from 0.1 to 0.05
- Try without label smoothing (set to 0.0)

### Issue: Ensemble overfitting
**Symptom**: Great validation accuracy, poor test accuracy
**Solution**:
- Use separate validation and test sets
- Optimize weights on different data split
- Use simple averaging instead of optimized weights

---

## Final Checklist

**Week 1 Completion**:
- [ ] Focal loss implemented and tested
- [ ] Cosine annealing LR scheduler working
- [ ] Label smoothing added
- [ ] TTA function created
- [ ] First model trained (90-92% accuracy)
- [ ] Validation metrics logged

**Week 2 Completion**:
- [ ] ResNet50 model trained
- [ ] EfficientNet-B4 model trained
- [ ] 3-model ensemble created
- [ ] Ensemble weights optimized
- [ ] **93-95% accuracy achieved** ✅

**Week 3 (Optional)**:
- [ ] Optical flow extraction working
- [ ] Two-stream model implemented
- [ ] Two-stream model trained
- [ ] 95-97% accuracy achieved

---

**Good luck!** Your target of 93-95% is highly achievable with this roadmap. 🎯
