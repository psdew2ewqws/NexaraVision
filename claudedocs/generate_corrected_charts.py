#!/usr/bin/env python3
"""
NexaraVision Report Charts - CORRECTED VERSION
Uses actual validation data from model training
"""

import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import numpy as np
import seaborn as sns
from pathlib import Path

output_dir = Path('/home/admin/Desktop/NexaraVision/claudedocs/report_charts')
output_dir.mkdir(parents=True, exist_ok=True)

plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("husl")

# ============================================================================
# 1. CONFUSION MATRIX - ST-GCN++ VALIDATION DATA (Option 2 - NTU Format)
# From TRAINING_RESULTS_SUMMARY.md - 567 test samples, 95.41% accuracy
# ============================================================================

def create_confusion_matrix(cm_data, title, filename, labels=['Non-Violence', 'Violence']):
    """Create and save a confusion matrix figure"""
    fig, ax = plt.subplots(figsize=(8, 6))
    cm = np.array(cm_data)

    # Calculate percentages
    cm_percent = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis] * 100

    # Create annotations with count and percentage
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

# ST-GCN++ (Option 2) - VALIDATION Confusion Matrix
# From TRAINING_RESULTS_SUMMARY.md: TN=252, FP=15, FN=11, TP=289
# Test Set: 567 samples, 95.41% accuracy
stgcnpp_validation_cm = [[252, 15], [11, 289]]
create_confusion_matrix(stgcnpp_validation_cm,
                        'ST-GCN++ Model - Validation Set Results\n(567 Samples, 95.41% Accuracy)',
                        'cm_stgcnpp_validation.png')

# MSG3D (Option 1) - VALIDATION Confusion Matrix
# From TRAINING_RESULTS_SUMMARY.md: TN=661, FP=164, FN=176, TP=685
# Test Set: 1,686 samples, 79.83% accuracy
msg3d_validation_cm = [[661, 164], [176, 685]]
create_confusion_matrix(msg3d_validation_cm,
                        'MSG3D Model - Validation Set Results\n(1,686 Samples, 79.83% Accuracy)',
                        'cm_msg3d_validation.png')

# ============================================================================
# 2. TRAINING CURVES - MSG3D (From actual training_history.json)
# ============================================================================

# Actual training data from server
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

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
epochs = list(range(1, 51))

# Accuracy curve
axes[0].plot(epochs, msg3d_history['train_acc'], 'b-', label='Training Accuracy', linewidth=2)
axes[0].plot(epochs, msg3d_history['val_acc'], 'r--', label='Validation Accuracy', linewidth=2)
axes[0].fill_between(epochs, msg3d_history['train_acc'], msg3d_history['val_acc'], alpha=0.1)
axes[0].set_xlabel('Epoch', fontsize=12)
axes[0].set_ylabel('Accuracy (%)', fontsize=12)
axes[0].set_title('MSG3D Training & Validation Accuracy', fontsize=14, fontweight='bold')
axes[0].legend(loc='lower right')
axes[0].set_ylim([60, 90])
axes[0].grid(True, alpha=0.3)
axes[0].axhline(y=83.85, color='green', linestyle=':', linewidth=2, alpha=0.7)
axes[0].text(52, 83.85, 'Best Val: 83.85%', fontsize=9, color='green')

# Loss curve
axes[1].plot(epochs, msg3d_history['train_loss'], 'b-', label='Training Loss', linewidth=2)
axes[1].set_xlabel('Epoch', fontsize=12)
axes[1].set_ylabel('Loss', fontsize=12)
axes[1].set_title('MSG3D Training Loss', fontsize=14, fontweight='bold')
axes[1].legend(loc='upper right')
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(output_dir / 'training_curves_msg3d.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: training_curves_msg3d.png")

# ============================================================================
# 3. MODEL COMPARISON - All 10 Models with correct data
# ============================================================================

models = ['MSG3D\nKaggle', 'MSG3D\nNTU120', 'MSG3D\nRWF2000', 'MSG3D\nSCVD',
          'STGCNPP\nKaggle', 'STGCNPP\nNTU120', 'STGCNPP\nRWF2000', 'STGCNPP\nSCVD',
          'MSG3D\nKag+NTU', 'STGCNPP\nKag+NTU']

# From MODEL_SELECTION_REPORT.md
train_acc = [91.67, 94.18, 79.75, 75.84, 91.99, 95.43, 80.38, 73.41, 95.17, 94.56]
test_videos = [3, 0, 2, 1, 3, 0, 2, 1, 2, 4]  # Correct out of 4 (0 for excluded NTU-only)

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

# Training accuracy
colors = ['#3498db' if 'MSG3D' in m else '#e74c3c' for m in models]
# Mark excluded models
for i, m in enumerate(models):
    if 'NTU120' in m:
        colors[i] = '#95a5a6'  # Gray for excluded

bars = axes[0].bar(range(len(models)), train_acc, color=colors, edgecolor='black', linewidth=0.5)
axes[0].set_xticks(range(len(models)))
axes[0].set_xticklabels(models, fontsize=9)
axes[0].set_ylabel('Training Accuracy (%)', fontsize=12)
axes[0].set_title('All Models - Training Accuracy', fontsize=14, fontweight='bold')
axes[0].axhline(y=90, color='green', linestyle='--', linewidth=2, label='90% Target')
axes[0].legend()
axes[0].set_ylim([70, 100])

for bar, acc in zip(bars, train_acc):
    axes[0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                 f'{acc:.1f}%', ha='center', va='bottom', fontsize=8)

# Test video score
colors_test = ['#2ecc71' if s == 4 else '#f39c12' if s >= 2 else '#e74c3c' for s in test_videos]
for i, m in enumerate(models):
    if 'NTU120' in m:
        colors_test[i] = '#95a5a6'  # Gray for excluded (domain mismatch)

bars2 = axes[1].bar(range(len(models)), test_videos, color=colors_test, edgecolor='black', linewidth=0.5)
axes[1].set_xticks(range(len(models)))
axes[1].set_xticklabels(models, fontsize=9)
axes[1].set_ylabel('Correct Predictions (out of 4)', fontsize=12)
axes[1].set_title('All Models - Test Video Performance', fontsize=14, fontweight='bold')
axes[1].axhline(y=4, color='green', linestyle='--', linewidth=2, label='Perfect Score')
axes[1].legend()
axes[1].set_ylim([0, 5])

for bar, score in zip(bars2, test_videos):
    label = f'{score}/4' if score > 0 else 'Excluded'
    axes[1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                 label, ha='center', va='bottom', fontsize=8, fontweight='bold')

plt.tight_layout()
plt.savefig(output_dir / 'model_comparison.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: model_comparison.png")

# ============================================================================
# 4. DETAILED MODEL COMPARISON TABLE
# ============================================================================

fig, ax = plt.subplots(figsize=(16, 10))
ax.axis('off')

# From MODEL_SELECTION_REPORT.md - Raw Confidence Scores
table_data = [
    ['Model', 'Dataset', 'Train Acc', 'Violence', 'Non-Viol', 'Jewelry', 'Cereal', 'Score', 'Status'],
    ['MSG3D_Kaggle', 'Kaggle', '91.67%', '96.5%', '33.1%', '95.4%', '0.6%', '3/4', 'FP Jewelry'],
    ['MSG3D_NTU120', 'NTU120', '94.18%', '0.0%', '0.0%', '0.0%', '0.5%', '0/4', 'EXCLUDED'],
    ['MSG3D_RWF2000', 'RWF2000', '79.75%', '97.8%', '79.9%', '97.5%', '42.3%', '2/4', 'High FP'],
    ['MSG3D_SCVD', 'SCVD', '75.84%', '97.6%', '78.2%', '97.6%', '61.5%', '1/4', 'High FP'],
    ['STGCNPP_Kaggle', 'Kaggle', '91.99%', '93.0%', '22.2%', '96.9%', '2.5%', '3/4', 'FP Jewelry'],
    ['STGCNPP_NTU120', 'NTU120', '95.43%', '0.0%', '0.0%', '0.0%', '0.0%', '0/4', 'EXCLUDED'],
    ['STGCNPP_RWF2000', 'RWF2000', '80.38%', '97.3%', '61.2%', '97.4%', '18.0%', '2/4', 'High FP'],
    ['STGCNPP_SCVD', 'SCVD', '73.41%', '87.3%', '84.0%', '93.0%', '81.6%', '1/4', 'High FP'],
    ['MSG3D_Kag+NTU', 'Kaggle+NTU', '95.17%', '99.9%', '90.7%', '99.0%', '0.0%', '2/4', 'FP Non-Viol'],
    ['STGCNPP_Kag+NTU', 'Kaggle+NTU', '94.56%', '97.4%', '7.6%', '83.6%', '0.5%', '4/4', 'SELECTED'],
]

table = ax.table(cellText=table_data, loc='center', cellLoc='center')
table.auto_set_font_size(False)
table.set_fontsize(9)
table.scale(1.2, 1.8)

# Style header
for j in range(9):
    table[(0, j)].set_facecolor('#4a90d9')
    table[(0, j)].set_text_props(color='white', fontweight='bold')

# Style rows
for i in range(1, len(table_data)):
    if 'SELECTED' in table_data[i][-1]:
        color = '#d4edda'  # Green for selected
    elif 'EXCLUDED' in table_data[i][-1]:
        color = '#f8d7da'  # Red for excluded
    else:
        color = '#ffffff'
    for j in range(9):
        table[(i, j)].set_facecolor(color)

ax.set_title('Comprehensive Model Comparison - All 10 Models\n(Confidence Scores on 4 Test Videos)',
             fontsize=14, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig(output_dir / 'detailed_model_comparison.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: detailed_model_comparison.png")

# ============================================================================
# 5. CONFIDENCE HEATMAP
# ============================================================================

models_short = ['MSG3D_Kaggle', 'MSG3D_RWF2000', 'MSG3D_SCVD', 'STGCNPP_Kaggle',
                'STGCNPP_RWF2000', 'STGCNPP_SCVD', 'MSG3D_Kag+NTU', 'STGCNPP_Kag+NTU']
videos = ['Violence.mp4', 'Non-Viol.mp4', 'Jewelry.mp4', 'Cereal.mp4']

# From MODEL_SELECTION_REPORT.md
confidence_data = [
    [96.5, 33.1, 95.4, 0.6],    # MSG3D_Kaggle
    [97.8, 79.9, 97.5, 42.3],   # MSG3D_RWF2000
    [97.6, 78.2, 97.6, 61.5],   # MSG3D_SCVD
    [93.0, 22.2, 96.9, 2.5],    # STGCNPP_Kaggle
    [97.3, 61.2, 97.4, 18.0],   # STGCNPP_RWF2000
    [87.3, 84.0, 93.0, 81.6],   # STGCNPP_SCVD
    [99.9, 90.7, 99.0, 0.0],    # MSG3D_Kaggle+NTU
    [97.4, 7.6, 83.6, 0.5],     # STGCNPP_Kaggle+NTU (SELECTED)
]

fig, ax = plt.subplots(figsize=(10, 8))
im = ax.imshow(confidence_data, cmap='RdYlGn_r', aspect='auto', vmin=0, vmax=100)

cbar = ax.figure.colorbar(im, ax=ax)
cbar.ax.set_ylabel('Violence Confidence (%)', rotation=-90, va="bottom", fontsize=12)

ax.set_xticks(np.arange(len(videos)))
ax.set_yticks(np.arange(len(models_short)))
ax.set_xticklabels(videos, fontsize=10)
ax.set_yticklabels(models_short, fontsize=10)

plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

for i in range(len(models_short)):
    for j in range(len(videos)):
        val = confidence_data[i][j]
        color = 'white' if val > 60 or val < 20 else 'black'
        ax.text(j, i, f'{val:.1f}%', ha="center", va="center", color=color, fontsize=10, fontweight='bold')

ax.set_title('Violence Detection Confidence Scores\n(All Models vs Test Videos)', fontsize=14, fontweight='bold')
ax.set_xlabel('Test Video', fontsize=12)
ax.set_ylabel('Model', fontsize=12)

# Highlight best model (last row)
rect = plt.Rectangle((-0.5, 7-0.5), 4, 1, fill=False, edgecolor='blue', linewidth=3)
ax.add_patch(rect)
ax.text(4.2, 7, '← BEST (4/4)', fontsize=10, color='blue', fontweight='bold', va='center')

plt.tight_layout()
plt.savefig(output_dir / 'confidence_heatmap.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: confidence_heatmap.png")

# ============================================================================
# 6. THRESHOLD ANALYSIS (From MODEL_SELECTION_REPORT.md)
# ============================================================================

thresholds = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 0.97]
false_positives = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]  # Jewelry causes FP below 85%
correct_score = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4]

fig, ax = plt.subplots(figsize=(12, 6))

ax.plot(thresholds, correct_score, 'g-o', label='Correct Predictions (out of 4)', linewidth=2, markersize=8)
ax.plot(thresholds, false_positives, 'r--s', label='False Positives', linewidth=2, markersize=8)

ax.fill_between(thresholds, 0, 4, where=[t >= 0.85 for t in thresholds],
                color='green', alpha=0.1, label='Optimal Zone (≥85%)')
ax.axvline(x=0.90, color='blue', linestyle=':', linewidth=2, label='Selected Threshold (90%)')

ax.set_xlabel('Violence Confidence Threshold', fontsize=12)
ax.set_ylabel('Count', fontsize=12)
ax.set_title('STGCNPP_Kaggle+NTU - Threshold Optimization\n(From MODEL_SELECTION_REPORT.md)', fontsize=14, fontweight='bold')
ax.legend(loc='center left', fontsize=10)
ax.set_xlim([0.25, 1.0])
ax.set_ylim([-0.5, 5])
ax.set_xticks(thresholds)
ax.set_xticklabels([f'{t:.0%}' for t in thresholds], rotation=45)
ax.grid(True, alpha=0.3)

ax.annotate('Jewelry video (83.6%)\ncauses FP below 85%', xy=(0.836, 1), xytext=(0.5, 2),
            arrowprops=dict(arrowstyle='->', color='red'), fontsize=9)
ax.annotate('Optimal: 90% threshold\n4/4 correct, 0 FP', xy=(0.90, 4), xytext=(0.92, 3),
            arrowprops=dict(arrowstyle='->', color='blue'), fontsize=9)

plt.tight_layout()
plt.savefig(output_dir / 'threshold_analysis.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: threshold_analysis.png")

# ============================================================================
# 7. DATASET DISTRIBUTION (From DATASET_CATALOG.md)
# ============================================================================

datasets = ['RWF-2000', 'Hockey\nFight', 'Video\nFights', 'SCVD', 'AIRTLab',
            'NTU RGB+D\n60', 'NTU\nViolence', 'Kinetics\nSkeleton', 'UCF101', 'KTH']
sizes_gb = [35, 0.195, 13, 1.2, 2.1, 20, 3.5, 43, 14, 1.1]
violence_specific = [1, 1, 1, 1, 1, 0, 1, 0, 0, 0]

fig, ax = plt.subplots(figsize=(14, 6))

colors = ['#e74c3c' if v else '#3498db' for v in violence_specific]
bars = ax.bar(range(len(datasets)), sizes_gb, color=colors, edgecolor='black', linewidth=0.5)

ax.set_xticks(range(len(datasets)))
ax.set_xticklabels(datasets, fontsize=10)
ax.set_ylabel('Size (GB)', fontsize=12)
ax.set_title('Training Datasets - Size Distribution\n(Total: ~133 GB, 324,000+ files)', fontsize=14, fontweight='bold')

from matplotlib.patches import Patch
legend_elements = [Patch(facecolor='#e74c3c', edgecolor='black', label='Violence-Specific'),
                   Patch(facecolor='#3498db', edgecolor='black', label='General Action Recognition')]
ax.legend(handles=legend_elements, loc='upper right', fontsize=10)

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
# 8. FINAL SUMMARY TABLE (Corrected tech stack)
# ============================================================================

fig, ax = plt.subplots(figsize=(12, 8))
ax.axis('off')

table_data = [
    ['Component', 'Technology', 'Version'],
    ['Framework', 'Next.js', '16.1.4'],
    ['Language', 'TypeScript', '5.x'],
    ['UI Library', 'React', '19.2.1'],
    ['Styling', 'Tailwind CSS', '4.x'],
    ['State', 'Zustand', '5.0.8'],
    ['Data Fetching', 'React Query', '5.90.9'],
    ['Backend', 'Supabase (Auth, DB, Realtime)', '2.91.0'],
    ['Animation', 'Framer Motion', '12.27.5'],
    ['Charts', 'Recharts', '3.4.1'],
    ['i18n', 'next-intl', '4.7.0'],
    ['ML Backend', 'FastAPI + PyTorch', '2.x'],
    ['Pose Estimation', 'YOLO v26', 'yolo26m-pose'],
    ['Violence Detection', 'ST-GCN++ + MS-G3D', 'Custom'],
    ['Deployment', 'Vercel + Vast.ai GPU', 'RTX 4090'],
]

table = ax.table(cellText=table_data, loc='center', cellLoc='left')
table.auto_set_font_size(False)
table.set_fontsize(11)
table.scale(1.5, 2)

for i in range(3):
    table[(0, i)].set_facecolor('#4a90d9')
    table[(0, i)].set_text_props(color='white', fontweight='bold')

for row in range(1, len(table_data)):
    for col in range(3):
        if row % 2 == 0:
            table[(row, col)].set_facecolor('#f0f0f0')

ax.set_title('NexaraVision Technology Stack\n(From package.json & GitHub)', fontsize=14, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig(output_dir / 'tech_stack_table.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: tech_stack_table.png")

# ============================================================================
# 9. PERFORMANCE SUMMARY TABLE
# ============================================================================

fig, ax = plt.subplots(figsize=(12, 6))
ax.axis('off')

perf_data = [
    ['Metric', 'Value', 'Notes'],
    ['Primary Model', 'STGCNPP_Kaggle+NTU', 'ST-GCN++ Architecture'],
    ['Training Accuracy', '94.56%', 'Kaggle + NTU Combined'],
    ['Validation Accuracy', '95.41%', '567 test samples'],
    ['Test Score', '4/4 Videos Correct', '0 False Positives'],
    ['Detection Threshold', '90%', 'Optimal from 15 tested'],
    ['Violence Confidence', '97.4%', 'On actual violence video'],
    ['Non-Violence Max', '83.6%', 'Jewelry video (below threshold)'],
    ['Inference Speed', '~25ms/frame', 'RTX 4090 GPU'],
    ['Real-time FPS', '~20 FPS', 'Full pipeline'],
]

table = ax.table(cellText=perf_data, loc='center', cellLoc='left')
table.auto_set_font_size(False)
table.set_fontsize(11)
table.scale(1.5, 2)

for i in range(3):
    table[(0, i)].set_facecolor('#4a90d9')
    table[(0, i)].set_text_props(color='white', fontweight='bold')

for row in range(1, len(perf_data)):
    for col in range(3):
        if row % 2 == 0:
            table[(row, col)].set_facecolor('#f0f0f0')

ax.set_title('NexaraVision Performance Summary', fontsize=14, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig(output_dir / 'final_summary_table.png', dpi=150, bbox_inches='tight')
plt.close()
print("Saved: final_summary_table.png")

print(f"\n{'='*60}")
print(f"Corrected charts saved to: {output_dir}")
print(f"{'='*60}")
