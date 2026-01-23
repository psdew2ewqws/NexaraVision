#!/usr/bin/env python3
"""
Generate professional flowchart images for NexaraVision Research Paper
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

# Set high DPI for publication quality
plt.rcParams['figure.dpi'] = 300
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.family'] = 'DejaVu Sans'

def create_smart_veto_architecture():
    """Figure 1: Smart Veto Ensemble Architecture"""
    fig, ax = plt.subplots(figsize=(12, 14))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 14)
    ax.axis('off')

    # Color scheme
    colors = {
        'input': '#E3F2FD',      # Light blue
        'process': '#FFF3E0',    # Light orange
        'model': '#E8F5E9',      # Light green
        'decision': '#FCE4EC',   # Light pink
        'primary': '#BBDEFB',    # Blue
        'veto': '#C8E6C9',       # Green
        'border': '#37474F',     # Dark gray
        'arrow': '#546E7A'       # Gray
    }

    def add_box(x, y, w, h, text, color, fontsize=10, bold=False):
        box = FancyBboxPatch((x, y), w, h,
                             boxstyle="round,pad=0.05,rounding_size=0.2",
                             facecolor=color, edgecolor=colors['border'], linewidth=2)
        ax.add_patch(box)
        weight = 'bold' if bold else 'normal'
        ax.text(x + w/2, y + h/2, text, ha='center', va='center',
                fontsize=fontsize, fontweight=weight, wrap=True)

    def add_arrow(x1, y1, x2, y2):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                   arrowprops=dict(arrowstyle='->', color=colors['arrow'], lw=2))

    # Title
    ax.text(6, 13.5, 'Smart Veto Ensemble Architecture', ha='center', va='center',
            fontsize=16, fontweight='bold')

    # Input box
    add_box(3, 12, 6, 0.8, 'INPUT: Video Frame (30 FPS)', colors['input'], bold=True)
    add_arrow(6, 12, 6, 11.3)

    # YOLOv26 + BoT-SORT
    add_box(2.5, 10.2, 7, 1, 'YOLOv26 Pose Estimation + BoT-SORT\n(17 COCO Keypoints)', colors['process'])
    add_arrow(6, 10.2, 6, 9.5)

    # One Euro Filter
    add_box(2.5, 8.4, 7, 1, 'One Euro Filter Smoothing\n(Speed-Adaptive Jitter Reduction)', colors['process'])
    add_arrow(6, 8.4, 6, 7.7)

    # Temporal Buffer
    add_box(2.5, 6.6, 7, 1, 'Per-Track Temporal Buffer\n(32 frames sliding window)', colors['process'])

    # Split arrows to dual models
    add_arrow(6, 6.6, 3.5, 5.9)
    add_arrow(6, 6.6, 8.5, 5.9)

    # PRIMARY Model
    add_box(1, 4, 5, 1.8, 'PRIMARY MODEL\nST-GCN++\n(94.56% accuracy)\nThreshold: 94%', colors['primary'], bold=True)

    # VETO Model
    add_box(6, 4, 5, 1.8, 'VETO MODEL\nMS-G3D\n(95.17% accuracy)\nThreshold: 85%', colors['veto'], bold=True)

    # Merge arrows
    add_arrow(3.5, 4, 6, 3.3)
    add_arrow(8.5, 4, 6, 3.3)

    # Smart Veto Logic
    add_box(1.5, 0.5, 9, 2.6, '', colors['decision'])
    ax.text(6, 2.7, 'SMART VETO LOGIC', ha='center', va='center', fontsize=12, fontweight='bold')
    ax.text(6, 2.1, 'VIOLENCE = (PRIMARY ≥ 94%) AND (VETO ≥ 85%)', ha='center', va='center', fontsize=10, color='#D32F2F')
    ax.text(6, 1.5, 'VETOED = (PRIMARY ≥ 94%) AND (VETO < 85%)', ha='center', va='center', fontsize=10, color='#FF9800')
    ax.text(6, 0.9, 'SAFE = (PRIMARY < 94%)', ha='center', va='center', fontsize=10, color='#4CAF50')

    plt.tight_layout()
    plt.savefig('/home/admin/Desktop/NexaraVision/docs/images/fig1_smart_veto_architecture.png',
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.savefig('/home/admin/Desktop/NexaraVision/docs/images/fig1_smart_veto_architecture.svg',
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Figure 1: Smart Veto Architecture saved")


def create_software_stack():
    """Figure 2: Software Stack Architecture"""
    fig, ax = plt.subplots(figsize=(12, 10))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 10)
    ax.axis('off')

    colors = {
        'frontend': '#E3F2FD',
        'nginx': '#FFF9C4',
        'backend': '#E8F5E9',
        'database': '#F3E5F5',
        'component': '#FFFFFF',
        'border': '#37474F',
        'arrow': '#546E7A'
    }

    def add_box(x, y, w, h, text, color, fontsize=10, bold=False):
        box = FancyBboxPatch((x, y), w, h,
                             boxstyle="round,pad=0.05,rounding_size=0.15",
                             facecolor=color, edgecolor=colors['border'], linewidth=2)
        ax.add_patch(box)
        weight = 'bold' if bold else 'normal'
        ax.text(x + w/2, y + h/2, text, ha='center', va='center',
                fontsize=fontsize, fontweight=weight)

    def add_arrow(x1, y1, x2, y2, label=''):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                   arrowprops=dict(arrowstyle='->', color=colors['arrow'], lw=2))
        if label:
            ax.text((x1+x2)/2 + 0.3, (y1+y2)/2, label, fontsize=9, color=colors['arrow'])

    # Title
    ax.text(6, 9.5, 'NexaraVision Software Stack', ha='center', fontsize=16, fontweight='bold')

    # Frontend
    add_box(2, 7.8, 8, 1.2, 'Frontend (Next.js 15)\nReact + TypeScript + Tailwind CSS', colors['frontend'], bold=True)
    add_arrow(6, 7.8, 6, 7.0)
    ax.text(6.3, 7.4, 'WebSocket (WSS)', fontsize=9, color=colors['arrow'])

    # Nginx
    add_box(2, 6, 8, 0.9, 'nginx (SSL Proxy)\nPort 8080 → 6006', colors['nginx'])
    add_arrow(6, 6, 6, 5.2)

    # Backend
    add_box(1, 2.5, 10, 2.5, '', colors['backend'])
    ax.text(6, 4.7, 'Python Backend (FastAPI + Uvicorn) - Port 6006', ha='center', fontsize=11, fontweight='bold')

    # Backend components
    components = ['YOLOv26-Pose', 'ST-GCN++', 'MS-G3D', 'BoT-SORT']
    for i, comp in enumerate(components):
        add_box(1.5 + i*2.4, 2.8, 2.2, 0.8, comp, colors['component'], fontsize=9)

    add_arrow(6, 2.5, 6, 1.7)

    # Database
    add_box(2, 0.3, 8, 1.2, 'Supabase (PostgreSQL)\nUser Auth | Configurations | Incidents | Real-time', colors['database'])

    plt.tight_layout()
    plt.savefig('/home/admin/Desktop/NexaraVision/docs/images/fig2_software_stack.png',
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.savefig('/home/admin/Desktop/NexaraVision/docs/images/fig2_software_stack.svg',
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Figure 2: Software Stack saved")


def create_processing_pipeline():
    """Figure 3: Real-Time Processing Pipeline with Latency"""
    fig, ax = plt.subplots(figsize=(10, 12))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 12)
    ax.axis('off')

    colors = {
        'stage': '#E8F5E9',
        'time': '#FFF3E0',
        'border': '#37474F',
        'arrow': '#4CAF50'
    }

    stages = [
        ('Frame Acquisition\n(WebSocket)', '< 5ms'),
        ('JPEG Decoding', '< 10ms'),
        ('YOLOv26 Pose Estimation\n+ BoT-SORT', '8-15ms'),
        ('One Euro Filter\nSmoothing', '< 1ms'),
        ('Per-Track Buffer\nUpdate', '< 1ms'),
        ('Dual-Model Inference\n(FP16, every 8 frames)', '20-30ms'),
        ('Smart Veto Decision', '< 1ms'),
        ('WebSocket Response', '< 5ms'),
    ]

    ax.text(5, 11.5, 'Real-Time Processing Pipeline', ha='center', fontsize=16, fontweight='bold')

    y_pos = 10.5
    for i, (stage, latency) in enumerate(stages):
        # Stage box
        box = FancyBboxPatch((1, y_pos - 0.9), 5.5, 0.9,
                             boxstyle="round,pad=0.03,rounding_size=0.1",
                             facecolor=colors['stage'], edgecolor=colors['border'], linewidth=1.5)
        ax.add_patch(box)
        ax.text(3.75, y_pos - 0.45, stage, ha='center', va='center', fontsize=10)

        # Latency box
        box2 = FancyBboxPatch((7, y_pos - 0.75), 2, 0.6,
                              boxstyle="round,pad=0.02,rounding_size=0.1",
                              facecolor=colors['time'], edgecolor=colors['border'], linewidth=1)
        ax.add_patch(box2)
        ax.text(8, y_pos - 0.45, latency, ha='center', va='center', fontsize=9, fontweight='bold')

        # Arrow to next stage
        if i < len(stages) - 1:
            ax.annotate('', xy=(3.75, y_pos - 1.15), xytext=(3.75, y_pos - 0.9),
                       arrowprops=dict(arrowstyle='->', color=colors['arrow'], lw=2))

        y_pos -= 1.2

    # Total latency
    ax.plot([1, 9], [0.8, 0.8], 'k-', lw=2)
    ax.text(5, 0.5, 'Total: < 50ms per frame | End-to-End: < 100ms',
            ha='center', fontsize=12, fontweight='bold', color='#1565C0')

    plt.tight_layout()
    plt.savefig('/home/admin/Desktop/NexaraVision/docs/images/fig3_processing_pipeline.png',
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.savefig('/home/admin/Desktop/NexaraVision/docs/images/fig3_processing_pipeline.svg',
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Figure 3: Processing Pipeline saved")


def create_graphical_abstract():
    """Figure 4: Graphical Abstract"""
    fig, ax = plt.subplots(figsize=(14, 8))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')

    # Background
    bg = FancyBboxPatch((0.2, 0.2), 13.6, 7.6,
                        boxstyle="round,pad=0.02,rounding_size=0.3",
                        facecolor='#FAFAFA', edgecolor='#1565C0', linewidth=3)
    ax.add_patch(bg)

    # Title
    ax.text(7, 7.3, 'NEXARAVISION', ha='center', fontsize=20, fontweight='bold', color='#1565C0')
    ax.text(7, 6.8, 'Real-Time Skeleton-Based Violence Detection', ha='center', fontsize=12, color='#546E7A')

    # Main flow boxes
    flow_y = 5.2
    flow_data = [
        ('VIDEO\nInput\n(30 FPS)', '#E3F2FD'),
        ('SKELETON\nExtraction\n(YOLOv26)', '#FFF3E0'),
        ('DUAL-MODEL\nSmart Veto\nEnsemble', '#E8F5E9'),
        ('ALERT\nDecision\nOutput', '#FCE4EC'),
    ]

    x_positions = [1.5, 4.5, 7.5, 10.5]
    for i, ((text, color), x) in enumerate(zip(flow_data, x_positions)):
        box = FancyBboxPatch((x, flow_y - 0.8), 2.4, 1.8,
                             boxstyle="round,pad=0.05,rounding_size=0.2",
                             facecolor=color, edgecolor='#37474F', linewidth=2)
        ax.add_patch(box)
        ax.text(x + 1.2, flow_y, text, ha='center', va='center', fontsize=10)

        # Arrows
        if i < 3:
            ax.annotate('', xy=(x + 2.6, flow_y), xytext=(x + 2.4, flow_y),
                       arrowprops=dict(arrowstyle='->', color='#546E7A', lw=2))

    # Key Metrics section
    ax.text(7, 3.5, 'KEY METRICS', ha='center', fontsize=14, fontweight='bold')
    metrics = [
        ('97.4%', 'TPR', '#4CAF50'),
        ('0.1%', 'FPR', '#F44336'),
        ('<100ms', 'Latency', '#2196F3'),
        ('50+', 'Users', '#9C27B0'),
    ]

    x_start = 1.5
    for i, (value, label, color) in enumerate(metrics):
        x = x_start + i * 3
        box = FancyBboxPatch((x, 2.2), 2.4, 1,
                             boxstyle="round,pad=0.05,rounding_size=0.15",
                             facecolor='white', edgecolor=color, linewidth=2)
        ax.add_patch(box)
        ax.text(x + 1.2, 2.9, value, ha='center', va='center', fontsize=14, fontweight='bold', color=color)
        ax.text(x + 1.2, 2.45, label, ha='center', va='center', fontsize=10, color='#546E7A')

    # Smart Veto Logic
    ax.text(7, 1.5, 'SMART VETO: PRIMARY (94%) + VETO (85%) → VIOLENCE | VETOED | SAFE',
            ha='center', fontsize=10, style='italic', color='#37474F')

    plt.tight_layout()
    plt.savefig('/home/admin/Desktop/NexaraVision/docs/images/fig4_graphical_abstract.png',
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.savefig('/home/admin/Desktop/NexaraVision/docs/images/fig4_graphical_abstract.svg',
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()
    print("✓ Figure 4: Graphical Abstract saved")


if __name__ == '__main__':
    print("Generating flowchart images for NexaraVision Research Paper...")
    print("=" * 60)
    create_smart_veto_architecture()
    create_software_stack()
    create_processing_pipeline()
    create_graphical_abstract()
    print("=" * 60)
    print("All figures generated successfully!")
    print("Images saved to: /home/admin/Desktop/NexaraVision/docs/images/")
