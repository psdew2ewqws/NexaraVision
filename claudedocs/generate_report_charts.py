#!/usr/bin/env python3
"""
NexaraVision Report Charts Generator
Generates confusion matrices, accuracy curves, and comparison charts for the capstone report
"""

import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import numpy as np
import seaborn as sns
from pathlib import Path
import json

# Create output directory
output_dir = Path('/home/admin/Desktop/NexaraVision/claudedocs/report_charts')
output_dir.mkdir(parents=True, exist_ok=True)

# Set style
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("husl")

# ============================================================================
# 1. CONFUSION MATRICES
# ============================================================================

def create_confusion_matrix(cm_data, title, filename, labels=['Non-Violence', 'Violence']):
    """Create and save a confusion matrix figure"""
    fig, ax = plt.subplots(figsize=(8, 6))

    cm = np.array(cm_data)

    # Normalize for percentages
    cm_percent = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis] * 100

    # Create annotations with both count and percentage
    annot = np.array([[f'{cm[i,j]}\n({cm_percent[i,j]:.1f}%)'
                       for j in range(cm.shape[1])]
                      for i in range(cm.shape[0])])

    sns.heatmap(cm, annot=annot, fmt='', cmap='Blues',
                xticklabels=labels, yticklabels=labels,
                annot_kws={'size': 14}, ax=ax)

    ax.set_xlabel('Predicted Label', fontsize=12)
    ax.set_ylabel('True Label', fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold')

    plt.tight_layout()
    plt.savefig(output_dir / filename, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Saved: {filename}")

# STGCNPP_Kaggle_NTU Confusion Matrix (from comprehensive test)
# Test: 4 videos - Violence.mp4, Non-Violence.mp4, Jewelry.mp4, Cereal.mp4
# Results at 90% threshold: Violence: 97.4%, Non-Viol: 7.6%, Jewelry: 83.6%, Cereal: 0.5%
# All 4 correct (1 TP, 3 TN, 0 FP, 0 FN)
stgcnpp_kaggle_ntu_cm = [[3, 0], [0, 1]]  # 3 TN, 1 TP, 0 FP, 0 FN
create_confusion_matrix(stgcnpp_kaggle_ntu_cm,
                        'STGCNPP_Kaggle_NTU Model - Test Results\n(4 Test Videos, Threshold: 90%)',
                        'cm_stgcnpp_kaggle_ntu.png')

# MSG3D_Kaggle_NTU Confusion Matrix (standalone test at 90%)
# Results: Violence: 99.9%, Non-Viol: 90.7% (FP!), Jewelry: 99.0% (FP!), Cereal: 0.0%
# Score: 2/4 correct (1 TP, 1 TN, 2 FP, 0 FN)
msg3d_kaggle_ntu_cm = [[1, 2], [0, 1]]  # 1 TN, 1 TP, 2 FP, 0 FN
create_confusion_matrix(msg3d_kaggle_ntu_cm,
                        'MSG3D_Kaggle_NTU Model - Test Results\n(4 Test Videos, Threshold: 90%)',
                        'cm_msg3d_kaggle_ntu.png')

# Smart Veto Ensemble Confusion Matrix (853 frames live test)
# Results: 1 Violence Alert (FP), 9 Vetoed, 843 Safe
smart_veto_cm = [[852, 1], [0, 0]]  # For non-violence video only test
create_confusion_matrix(smart_veto_cm,
                        'Smart Veto Ensemble - Live Test Results\n(853 Frames, Non-Violence Video)',
                        'cm_smart_veto_live.png')

# Training Data Confusion Matrix - Option 2 (NTU Format + ST-GCN++)
# From TRAINING_RESULTS_SUMMARY.md: Test accuracy 95.41%
# Confusion: TN=252, FP=15, FN=11, TP=289
stgcnpp_training_cm = [[252, 15], [11, 289]]
create_confusion_matrix(stgcnpp_training_cm,
                        'ST-GCN++ Training Results - NTU Format\n(567 Test Samples, 95.41% Accuracy)',
                        'cm_stgcnpp_training.png')

# Training Data Confusion Matrix - Option 1 (COCO Format + MSG3D)
# From TRAINING_RESULTS_SUMMARY.md: Test accuracy 79.83%
# Confusion: TN=661, FP=164, FN=176, TP=685
msg3d_training_cm = [[661, 164], [176, 685]]
create_confusion_matrix(msg3d_training_cm,
                        'MSG3D Training Results - COCO Format\n(1686 Test Samples, 79.83% Accuracy)',
                        'cm_msg3d_training.png')

# ============================================================================
# 2. TRAINING ACCURACY CURVES
# ============================================================================

# MSG3D training history (from server)
msg3d_history = {
    "train_loss": [0.6400, 0.6093, 0.6063, 0.5906, 0.5770, 0.5592, 0.5562, 0.5445, 0.5506, 0.5445,
                   0.5331, 0.5278, 0.5237, 0.5180, 0.5146, 0.5006, 0.4964, 0.4891, 0.4868, 0.4805,
                   0.4756, 0.4577, 0.4496, 0.4448, 0.4438, 0.4390, 0.4423, 0.4262, 0.4296, 0.4208,
                   0.4134, 0.4189, 0.3992, 0.3827, 0.3864, 0.3839, 0.3800, 0.3795, 0.3744, 0.3797,
                   0.3759, 0.3715, 0.3607, 0.3602, 0.3505, 0.3517, 0.3445, 0.3394, 0.3340, 0.3377],
    "train_acc": [66.97, 68.06, 68.21, 68.10, 69.25, 69.70, 70.34, 71.12, 69.74, 69.40,
                  71.54, 72.32, 72.51, 72.55, 73.11, 74.86, 73.03, 74.15, 74.90, 74.86,
                  75.69, 76.32, 76.36, 77.37, 77.93, 77.33, 77.78, 78.68, 77.48, 78.38,
                  78.38, 78.60, 80.40, 80.59, 80.74, 80.44, 80.66, 80.55, 81.00, 81.30,
                  80.81, 81.60, 82.46, 82.38, 82.12, 82.61, 82.57, 83.69, 83.43, 82.79],
    "val_acc": [66.03, 65.40, 64.36, 73.58, 67.08, 69.60, 75.68, 73.37, 67.92, 67.71,
                71.06, 71.27, 77.14, 76.51, 80.71, 74.21, 75.05, 79.03, 79.03, 69.60,
                79.87, 78.61, 80.08, 78.40, 79.24, 81.13, 79.87, 80.50, 73.16, 81.13,
                80.50, 79.03, 81.13, 80.92, 74.21, 81.13, 82.59, 82.18, 82.38, 82.80,
                82.18, 81.76, 80.92, 82.59, 82.38, 82.80, 83.43, 83.01, 83.64, 83.85]
}

# Create training curves figure
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

epochs = list(range(1, len(msg3d_history['train_acc']) + 1))

# Accuracy curve
axes[0].plot(epochs, msg3d_history['train_acc'], 'b-', label='Training Accuracy', linewidth=2)
axes[0].plot(epochs, msg3d_history['val_acc'], 'r--', label='Validation Accuracy', linewidth=2)
axes[0].fill_between(epochs, msg3d_history['train_acc'], msg3d_history['val_acc'], alpha=0.1)
axes[0].set_xlabel('Epoch', fontsize=12)
axes[0].set_ylabel('Accuracy (%)', fontsize=12)
axes[0].set_title('MSG3D Training Accuracy Over 50 Epochs', fontsize=14, fontweight='bold')
axes[0].legend(loc='lower right', fontsize=10)
axes[0].set_ylim([60, 90])
axes[0].grid(True, alpha=0.3)

# Loss curve
axes[1].plot(epochs, msg3d_history['train_loss'], 'b-', label='Training Loss', linewidth=2)
axes[1].set_xlabel('Epoch', fontsize=12)
axes[1].set_ylabel('Loss', fontsize=12)
axes[1].set_title('MSG3D Training Loss Over 50 Epochs', fontsize=14, fontweight='bold')
axes[1].legend(loc='upper right', fontsize=10)
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(output_dir / 'training_curves_msg3d.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: training_curves_msg3d.png")

# ============================================================================
# 3. MODEL COMPARISON CHART
# ============================================================================

# Model comparison data from comprehensive testing
models = ['MSG3D\nKaggle', 'MSG3D\nNTU120', 'MSG3D\nRWF2000', 'MSG3D\nSCVD',
          'STGCNPP\nKaggle', 'STGCNPP\nNTU120', 'STGCNPP\nRWF2000', 'STGCNPP\nSCVD',
          'MSG3D\nKaggle+NTU', 'STGCNPP\nKaggle+NTU']

train_acc = [91.67, 94.18, 79.75, 75.84, 91.99, 95.43, 80.38, 73.41, 95.17, 94.56]
test_videos = [3, 0, 2, 1, 3, 0, 2, 1, 2, 4]  # Correct out of 4

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

# Training accuracy
colors = ['#3498db' if 'MSG3D' in m else '#e74c3c' for m in models]
bars = axes[0].bar(range(len(models)), train_acc, color=colors, edgecolor='black', linewidth=0.5)
axes[0].set_xticks(range(len(models)))
axes[0].set_xticklabels(models, fontsize=9)
axes[0].set_ylabel('Training Accuracy (%)', fontsize=12)
axes[0].set_title('All Models - Training Accuracy Comparison', fontsize=14, fontweight='bold')
axes[0].axhline(y=90, color='green', linestyle='--', linewidth=2, label='90% Target')
axes[0].legend()
axes[0].set_ylim([70, 100])

# Add value labels
for bar, acc in zip(bars, train_acc):
    axes[0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                 f'{acc:.1f}%', ha='center', va='bottom', fontsize=8)

# Test video score
colors_test = ['#2ecc71' if s == 4 else '#f39c12' if s >= 3 else '#e74c3c' for s in test_videos]
bars2 = axes[1].bar(range(len(models)), test_videos, color=colors_test, edgecolor='black', linewidth=0.5)
axes[1].set_xticks(range(len(models)))
axes[1].set_xticklabels(models, fontsize=9)
axes[1].set_ylabel('Correct Predictions (out of 4)', fontsize=12)
axes[1].set_title('All Models - Test Video Performance', fontsize=14, fontweight='bold')
axes[1].axhline(y=4, color='green', linestyle='--', linewidth=2, label='Perfect Score (4/4)')
axes[1].legend()
axes[1].set_ylim([0, 5])

# Add value labels
for bar, score in zip(bars2, test_videos):
    axes[1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                 f'{score}/4', ha='center', va='bottom', fontsize=9, fontweight='bold')

plt.tight_layout()
plt.savefig(output_dir / 'model_comparison.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: model_comparison.png")

# ============================================================================
# 4. THRESHOLD ANALYSIS CHART
# ============================================================================

# Threshold experiment data for STGCNPP_Kaggle_NTU
thresholds = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 0.97]
false_positives = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]
correct_score = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4]

fig, ax = plt.subplots(figsize=(12, 6))

ax.plot(thresholds, correct_score, 'g-o', label='Correct Predictions (out of 4)', linewidth=2, markersize=8)
ax.plot(thresholds, false_positives, 'r--s', label='False Positives', linewidth=2, markersize=8)

ax.fill_between(thresholds, 0, 4, where=[t >= 0.85 for t in thresholds],
                color='green', alpha=0.1, label='Optimal Zone (≥85%)')
ax.axvline(x=0.90, color='blue', linestyle=':', linewidth=2, label='Selected Threshold (90%)')

ax.set_xlabel('Violence Confidence Threshold', fontsize=12)
ax.set_ylabel('Count', fontsize=12)
ax.set_title('STGCNPP_Kaggle_NTU - Threshold Analysis\n(Impact on Detection Accuracy)', fontsize=14, fontweight='bold')
ax.legend(loc='center left', fontsize=10)
ax.set_xlim([0.25, 1.0])
ax.set_ylim([-0.5, 5])
ax.set_xticks(thresholds)
ax.set_xticklabels([f'{t:.0%}' for t in thresholds], rotation=45)
ax.grid(True, alpha=0.3)

# Add annotations
ax.annotate('Jewelry video (83.6%)\ncauses FP below 85%', xy=(0.836, 1), xytext=(0.5, 2),
            arrowprops=dict(arrowstyle='->', color='red'), fontsize=9)
ax.annotate('Optimal: 90% threshold\n4/4 correct, 0 FP', xy=(0.90, 4), xytext=(0.92, 3),
            arrowprops=dict(arrowstyle='->', color='blue'), fontsize=9)

plt.tight_layout()
plt.savefig(output_dir / 'threshold_analysis.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: threshold_analysis.png")

# ============================================================================
# 5. RAW CONFIDENCE SCORES HEATMAP
# ============================================================================

# Raw confidence scores from comprehensive test
models_short = ['MSG3D_Kaggle', 'MSG3D_RWF2000', 'MSG3D_SCVD', 'STGCNPP_Kaggle',
                'STGCNPP_RWF2000', 'STGCNPP_SCVD', 'MSG3D_Kag+NTU', 'STGCNPP_Kag+NTU']
videos = ['Violence.mp4', 'Non-Viol.mp4', 'Jewelry.mp4', 'Cereal.mp4']

# Confidence scores (violence probability %)
confidence_data = [
    [96.5, 33.1, 95.4, 0.6],    # MSG3D_Kaggle
    [97.8, 79.9, 97.5, 42.3],   # MSG3D_RWF2000
    [97.6, 78.2, 97.6, 61.5],   # MSG3D_SCVD
    [93.0, 22.2, 96.9, 2.5],    # STGCNPP_Kaggle
    [97.3, 61.2, 97.4, 18.0],   # STGCNPP_RWF2000
    [87.3, 84.0, 93.0, 81.6],   # STGCNPP_SCVD
    [99.9, 90.7, 99.0, 0.0],    # MSG3D_Kaggle+NTU
    [97.4, 7.6, 83.6, 0.5],     # STGCNPP_Kaggle+NTU
]

fig, ax = plt.subplots(figsize=(10, 8))

# Create heatmap
im = ax.imshow(confidence_data, cmap='RdYlGn_r', aspect='auto', vmin=0, vmax=100)

# Add colorbar
cbar = ax.figure.colorbar(im, ax=ax)
cbar.ax.set_ylabel('Violence Confidence (%)', rotation=-90, va="bottom", fontsize=12)

# Set ticks
ax.set_xticks(np.arange(len(videos)))
ax.set_yticks(np.arange(len(models_short)))
ax.set_xticklabels(videos, fontsize=10)
ax.set_yticklabels(models_short, fontsize=10)

# Rotate x labels
plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

# Add text annotations
for i in range(len(models_short)):
    for j in range(len(videos)):
        val = confidence_data[i][j]
        color = 'white' if val > 60 or val < 20 else 'black'
        text = ax.text(j, i, f'{val:.1f}%', ha="center", va="center", color=color, fontsize=10, fontweight='bold')

ax.set_title('Violence Detection Confidence Scores\n(All Models vs Test Videos)', fontsize=14, fontweight='bold')
ax.set_xlabel('Test Video', fontsize=12)
ax.set_ylabel('Model', fontsize=12)

# Highlight best model row
rect = plt.Rectangle((-0.5, 7-0.5), 4, 1, fill=False, edgecolor='blue', linewidth=3)
ax.add_patch(rect)
ax.text(4.2, 7, '← BEST', fontsize=10, color='blue', fontweight='bold', va='center')

plt.tight_layout()
plt.savefig(output_dir / 'confidence_heatmap.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: confidence_heatmap.png")

# ============================================================================
# 6. SMART VETO DECISION FLOW DIAGRAM
# ============================================================================

fig, ax = plt.subplots(figsize=(12, 8))
ax.set_xlim(0, 12)
ax.set_ylim(0, 10)
ax.axis('off')

# Draw boxes and arrows
def draw_box(ax, x, y, w, h, text, color='lightblue'):
    rect = plt.Rectangle((x, y), w, h, fill=True, facecolor=color, edgecolor='black', linewidth=2)
    ax.add_patch(rect)
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=10, fontweight='bold', wrap=True)

def draw_diamond(ax, x, y, size, text, color='lightyellow'):
    diamond = plt.Polygon([(x, y-size), (x+size, y), (x, y+size), (x-size, y)],
                          facecolor=color, edgecolor='black', linewidth=2)
    ax.add_patch(diamond)
    ax.text(x, y, text, ha='center', va='center', fontsize=9, fontweight='bold')

def draw_arrow(ax, start, end):
    ax.annotate('', xy=end, xytext=start,
                arrowprops=dict(arrowstyle='->', color='black', lw=2))

# Draw components
draw_box(ax, 4, 9, 4, 0.8, 'Video Frame Input', 'lightgray')
draw_arrow(ax, (6, 9), (6, 8.3))

draw_box(ax, 3.5, 7.3, 5, 0.8, 'YOLO v26 Pose Extraction\n(17 COCO Keypoints)', 'lightyellow')
draw_arrow(ax, (6, 7.3), (6, 6.5))

draw_box(ax, 3, 5.5, 6, 0.8, 'PRIMARY: STGCNPP_Kaggle_NTU\n(94.56% Training Accuracy)', 'lightblue')
draw_arrow(ax, (6, 5.5), (6, 4.8))

draw_diamond(ax, 6, 4, 0.7, '≥94%?', 'lightyellow')
draw_arrow(ax, (5.3, 4), (3.5, 4))
draw_arrow(ax, (6.7, 4), (8.5, 4))

# SAFE path
draw_box(ax, 1.5, 3.4, 2, 0.8, 'SAFE', '#90EE90')
ax.text(2.5, 4.3, 'NO', fontsize=9, fontweight='bold', color='red')

# Continue path
draw_box(ax, 8.5, 3.4, 2.5, 0.8, 'Check VETO', 'lightyellow')
ax.text(8.5, 4.3, 'YES', fontsize=9, fontweight='bold', color='green')
draw_arrow(ax, (9.75, 3.4), (9.75, 2.7))

draw_box(ax, 7.5, 1.7, 4.5, 0.8, 'VETO: MSG3D_Kaggle_NTU\n(95.17% Training Accuracy)', 'lightcoral')
draw_arrow(ax, (9.75, 1.7), (9.75, 1))

draw_diamond(ax, 9.75, 0.3, 0.6, '≥85%?', 'lightyellow')

# Final decisions
draw_box(ax, 7, -0.5, 1.8, 0.6, 'VETOED', '#FFD700')
draw_box(ax, 10.5, -0.5, 2.2, 0.6, 'VIOLENCE!', '#FF6B6B')
ax.text(8, 0.5, 'NO', fontsize=9, fontweight='bold', color='red')
ax.text(11, 0.5, 'YES', fontsize=9, fontweight='bold', color='green')
draw_arrow(ax, (9.15, 0.3), (8.8, 0))
draw_arrow(ax, (10.35, 0.3), (10.7, 0))

ax.set_title('Smart Veto Ensemble - Decision Flow', fontsize=16, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig(output_dir / 'smart_veto_flow.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: smart_veto_flow.png")

# ============================================================================
# 7. DATASET DISTRIBUTION CHART
# ============================================================================

# Dataset sizes from DATASET_CATALOG.md
datasets = ['RWF-2000', 'Hockey\nFight', 'Video\nFights', 'SCVD', 'AIRTLab',
            'NTU RGB+D\n60', 'NTU\nViolence', 'Kinetics\nSkeleton', 'UCF101', 'KTH']
sizes_gb = [35, 0.195, 13, 1.2, 2.1, 20, 3.5, 43, 14, 1.1]
violence_specific = [1, 1, 1, 1, 1, 0, 1, 0, 0, 0]  # 1 = violence-specific

fig, ax = plt.subplots(figsize=(14, 6))

colors = ['#e74c3c' if v else '#3498db' for v in violence_specific]
bars = ax.bar(range(len(datasets)), sizes_gb, color=colors, edgecolor='black', linewidth=0.5)

ax.set_xticks(range(len(datasets)))
ax.set_xticklabels(datasets, fontsize=10)
ax.set_ylabel('Size (GB)', fontsize=12)
ax.set_title('Training Datasets - Size Distribution\n(Total: ~133 GB, 324,000+ files)', fontsize=14, fontweight='bold')

# Add legend
from matplotlib.patches import Patch
legend_elements = [Patch(facecolor='#e74c3c', edgecolor='black', label='Violence-Specific'),
                   Patch(facecolor='#3498db', edgecolor='black', label='General Action Recognition')]
ax.legend(handles=legend_elements, loc='upper right', fontsize=10)

# Add value labels
for bar, size in zip(bars, sizes_gb):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
            f'{size:.1f} GB', ha='center', va='bottom', fontsize=9)

ax.set_ylim([0, 50])
ax.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig(output_dir / 'dataset_distribution.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: dataset_distribution.png")

# ============================================================================
# 8. SYSTEM ARCHITECTURE DIAGRAM
# ============================================================================

fig, ax = plt.subplots(figsize=(14, 10))
ax.set_xlim(0, 14)
ax.set_ylim(0, 12)
ax.axis('off')

# Title
ax.text(7, 11.5, 'NexaraVision System Architecture', fontsize=18, fontweight='bold',
        ha='center', va='center')

# Client Side
draw_box(ax, 0.5, 8.5, 5, 2.5, '', '#E8F4FD')
ax.text(3, 10.7, 'Client (Browser)', fontsize=12, fontweight='bold', ha='center')
ax.text(3, 9.7, 'Next.js Frontend\n(Port 3000)', fontsize=10, ha='center')
ax.text(3, 8.7, 'Camera/Screen Capture\nWebSocket Client', fontsize=9, ha='center')

# Backend Services
draw_box(ax, 6, 8.5, 7.5, 2.5, '', '#FFF3E0')
ax.text(9.75, 10.7, 'Backend Services', fontsize=12, fontweight='bold', ha='center')
ax.text(7.5, 9.7, 'Supabase\n(Auth, DB, Realtime)', fontsize=9, ha='center')
ax.text(12, 9.7, 'Vercel\n(Deployment)', fontsize=9, ha='center')

# ML Service
draw_box(ax, 3, 4.5, 8, 3, '', '#E8F5E9')
ax.text(7, 7.2, 'ML Violence Detection Service (Vast.ai GPU)', fontsize=12, fontweight='bold', ha='center')
ax.text(4.5, 6.2, 'YOLO v26\nPose Estimation', fontsize=9, ha='center')
ax.text(7, 6.2, 'STGCNPP\n(PRIMARY)', fontsize=9, ha='center')
ax.text(9.5, 6.2, 'MSG3D\n(VETO)', fontsize=9, ha='center')
ax.text(7, 5, 'Smart Veto Ensemble\n(94% + 85% Thresholds)', fontsize=10, ha='center', fontweight='bold')

# Data Flow
draw_box(ax, 0.5, 1, 5, 2.5, '', '#FFEBEE')
ax.text(3, 3.2, 'Training Data', fontsize=12, fontweight='bold', ha='center')
ax.text(3, 2.2, 'Kaggle + NTU RGB+D 60\n(Combined Dataset)', fontsize=9, ha='center')
ax.text(3, 1.3, '~8,000 Samples\nBinary Classification', fontsize=9, ha='center')

# Output
draw_box(ax, 8.5, 1, 5, 2.5, '', '#F3E5F5')
ax.text(11, 3.2, 'Alert System', fontsize=12, fontweight='bold', ha='center')
ax.text(11, 2.2, 'WhatsApp • Telegram • Discord\nReal-time Notifications', fontsize=9, ha='center')
ax.text(11, 1.3, 'Evidence Vault\nIncident Reports', fontsize=9, ha='center')

# Arrows
ax.annotate('', xy=(6, 9.5), xytext=(5.5, 9.5), arrowprops=dict(arrowstyle='->', lw=2))
ax.annotate('', xy=(5.5, 6), xytext=(3, 8.5), arrowprops=dict(arrowstyle='->', lw=2))
ax.annotate('', xy=(7, 4.5), xytext=(7, 3.5), arrowprops=dict(arrowstyle='<->', lw=2))
ax.annotate('', xy=(8.5, 2.25), xytext=(7, 4.5), arrowprops=dict(arrowstyle='->', lw=2))

# Labels
ax.text(5.75, 9.7, 'API', fontsize=8, ha='center')
ax.text(3.5, 7.3, 'WebSocket\nFrames', fontsize=8, ha='center')
ax.text(6.3, 4, 'Models', fontsize=8, ha='center')
ax.text(7.8, 3.5, 'Violence\nAlerts', fontsize=8, ha='center')

# Performance metrics
ax.text(0.5, 0.3, 'Performance: ~20 FPS | 25ms Inference | 0.1% FP Rate | 95% Accuracy',
        fontsize=10, style='italic')

plt.tight_layout()
plt.savefig(output_dir / 'system_architecture.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: system_architecture.png")

# ============================================================================
# 9. FINAL SUMMARY TABLE
# ============================================================================

fig, ax = plt.subplots(figsize=(12, 6))
ax.axis('off')

# Table data
table_data = [
    ['Metric', 'Value', 'Notes'],
    ['Primary Model', 'STGCNPP_Kaggle_NTU', 'ST-GCN++ Architecture'],
    ['Training Accuracy', '94.56%', 'Kaggle + NTU Combined'],
    ['Veto Model', 'MSG3D_Kaggle_NTU', 'Multi-Scale G3D'],
    ['Veto Accuracy', '95.17%', 'Kaggle + NTU Combined'],
    ['Detection Threshold', 'PRIMARY ≥94%, VETO ≥85%', 'Smart Veto Ensemble'],
    ['Test Score', '4/4 Videos Correct', '0 False Positives'],
    ['Live FP Rate', '0.1% (1/853)', 'Crowded Scene Test'],
    ['Inference Speed', '~25ms/frame', 'RTX 4090 GPU'],
    ['Real-time FPS', '~20 FPS', 'Full Pipeline'],
]

table = ax.table(cellText=table_data, loc='center', cellLoc='left')
table.auto_set_font_size(False)
table.set_fontsize(11)
table.scale(1.5, 2)

# Style header
for i in range(3):
    table[(0, i)].set_facecolor('#4a90d9')
    table[(0, i)].set_text_props(color='white', fontweight='bold')

# Style rows
for row in range(1, len(table_data)):
    for col in range(3):
        if row % 2 == 0:
            table[(row, col)].set_facecolor('#f0f0f0')

ax.set_title('NexaraVision Violence Detection - Final Configuration Summary',
             fontsize=14, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig(output_dir / 'final_summary_table.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: final_summary_table.png")

print(f"\n{'='*60}")
print(f"All charts saved to: {output_dir}")
print(f"Total charts generated: 9")
print(f"{'='*60}")
