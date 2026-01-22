#!/usr/bin/env python3
"""
Apply IoU-based NMS fix to smart_veto_final.py
Replaces the section that processes valid_indices with IoU-based deduplication
"""

def main():
    filepath = '/app/nexaravision/smart_veto_final.py'

    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Find the line "if len(valid_indices) > 0:" and the for loop end
    start_line = None
    end_line = None

    for i, line in enumerate(lines):
        if 'if len(valid_indices) > 0:' in line:
            start_line = i
        # Find the end of the old processing block (line with "kpts[vis_idx] = skeleton")
        if start_line is not None and 'kpts[vis_idx] = skeleton' in line:
            end_line = i
            break

    if start_line is None or end_line is None:
        print(f"ERROR: Could not find code block. start={start_line}, end={end_line}")
        return 1

    print(f"Found code block at lines {start_line+1}-{end_line+1}")

    # Get the indentation from the if statement
    indent = lines[start_line][:len(lines[start_line]) - len(lines[start_line].lstrip())]

    # New code with IoU-based NMS
    new_code = f'''{indent}if len(valid_indices) > 0:
{indent}    # ===== FIX: IoU-based NMS to remove duplicate detections =====
{indent}    # YOLO can detect same person multiple times - filter using bounding box overlap
{indent}    def calc_iou(box1, box2):
{indent}        """Calculate Intersection over Union between two boxes [x1,y1,x2,y2]"""
{indent}        x1 = max(box1[0], box2[0])
{indent}        y1 = max(box1[1], box2[1])
{indent}        x2 = min(box1[2], box2[2])
{indent}        y2 = min(box1[3], box2[3])
{indent}        inter = max(0, x2-x1) * max(0, y2-y1)
{indent}        area1 = (box1[2]-box1[0]) * (box1[3]-box1[1])
{indent}        area2 = (box2[2]-box2[0]) * (box2[3]-box2[1])
{indent}        union = area1 + area2 - inter
{indent}        return inter / union if union > 0 else 0

{indent}    # Sort valid detections by bbox area (larger = closer/more reliable)
{indent}    areas = [(boxes[i][2]-boxes[i][0])*(boxes[i][3]-boxes[i][1]) for i in valid_indices]
{indent}    sorted_pairs = sorted(zip(valid_indices, areas), key=lambda x: x[1], reverse=True)

{indent}    # NMS: Keep only boxes with IoU < 0.5 with all previously kept boxes
{indent}    IOU_THRESHOLD = 0.5  # 50% overlap = same person
{indent}    kept_indices = []
{indent}    for idx, area in sorted_pairs:
{indent}        box = boxes[idx]
{indent}        is_duplicate = False
{indent}        for kept_idx in kept_indices:
{indent}            if calc_iou(box, boxes[kept_idx]) > IOU_THRESHOLD:
{indent}                is_duplicate = True
{indent}                break
{indent}        if not is_duplicate:
{indent}            kept_indices.append(idx)

{indent}    # Process only deduplicated detections (up to 10 for visualization)
{indent}    max_visual = min(len(kept_indices), 10)
{indent}    for vis_idx, idx in enumerate(kept_indices[:max_visual]):
{indent}        skeleton = kp[idx][:17, :3]
{indent}        kpts_visual.append(skeleton)
{indent}        # Only use top 2 for model (BatchNorm trained with M=2)
{indent}        if vis_idx < 2:
{indent}            kpts[vis_idx] = skeleton
'''

    # Reconstruct the file
    new_lines = lines[:start_line] + [new_code] + lines[end_line+1:]

    with open(filepath, 'w') as f:
        f.writelines(new_lines)

    print("SUCCESS: Applied IoU-based NMS deduplication fix")
    print("- IoU threshold: 0.5 (50% bounding box overlap = same person)")
    print("- Up to 10 unique people will be visualized")
    print("- Duplicate detections of same person are now filtered out")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
