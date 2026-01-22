#!/usr/bin/env python3
"""
Fix for double skeleton issue - adds IoU-based NMS to server
This script patches smart_veto_final.py to deduplicate YOLO detections
"""

# The patched section - replaces the YOLO detection processing block
PATCHED_CODE = '''            # Extract poses with YOLOv26
            results = yolo_model(frame, verbose=False)
            kpts = np.zeros((2, 17, 3), dtype=np.float32)  # Model trained with 2 people (BatchNorm expects 102 elements)
            kpts_visual = []  # For visualization - complete bodies only

            if results and results[0].keypoints is not None and results[0].boxes is not None:
                    kp = results[0].keypoints.data.cpu().numpy()
                    boxes = results[0].boxes.xyxy.cpu().numpy()

                    # Filter: Reject obvious false detections (fists, random objects)
                    # Lenient: just need some upper body keypoints visible
                    valid_indices = []
                    for i in range(len(kp)):
                        skeleton = kp[i][:17, :3]
                        # Count visible keypoints (confidence > 0.3)
                        visible = sum(1 for k in skeleton if k[2] > 0.3)
                        # Check for upper body: head (0) OR shoulders (5,6)
                        has_head = skeleton[0][2] > 0.3
                        has_any_shoulder = skeleton[5][2] > 0.3 or skeleton[6][2] > 0.3
                        # Accept if: at least 5 keypoints AND (head OR shoulder visible)
                        if visible >= 5 and (has_head or has_any_shoulder):
                            valid_indices.append(i)

                    if len(valid_indices) > 0:
                        # ===== FIX: IoU-based NMS to remove duplicate detections =====
                        # Calculate IoU between all pairs of valid bounding boxes
                        def calc_iou(box1, box2):
                            """Calculate Intersection over Union between two boxes [x1,y1,x2,y2]"""
                            x1 = max(box1[0], box2[0])
                            y1 = max(box1[1], box2[1])
                            x2 = min(box1[2], box2[2])
                            y2 = min(box1[3], box2[3])
                            inter = max(0, x2-x1) * max(0, y2-y1)
                            area1 = (box1[2]-box1[0]) * (box1[3]-box1[1])
                            area2 = (box2[2]-box2[0]) * (box2[3]-box2[1])
                            union = area1 + area2 - inter
                            return inter / union if union > 0 else 0

                        # Sort by bbox area (largest first)
                        areas = [(boxes[i][2]-boxes[i][0])*(boxes[i][3]-boxes[i][1]) for i in valid_indices]
                        sorted_pairs = sorted(zip(valid_indices, areas), key=lambda x: x[1], reverse=True)

                        # NMS: Keep only boxes with IoU < 0.5 with all kept boxes
                        IOU_THRESHOLD = 0.5
                        kept_indices = []
                        for idx, area in sorted_pairs:
                            box = boxes[idx]
                            # Check IoU with all already-kept boxes
                            is_duplicate = False
                            for kept_idx in kept_indices:
                                if calc_iou(box, boxes[kept_idx]) > IOU_THRESHOLD:
                                    is_duplicate = True
                                    break
                            if not is_duplicate:
                                kept_indices.append(idx)

                        # Process only deduplicated detections (up to 10 for visualization)
                        max_visual = min(len(kept_indices), 10)
                        for vis_idx, idx in enumerate(kept_indices[:max_visual]):
                            skeleton = kp[idx][:17, :3]
                            kpts_visual.append(skeleton)  # Add for visualization
                            # Only use top 2 for model (BatchNorm trained with M=2)
                            if vis_idx < 2:
                                kpts[vis_idx] = skeleton
'''

# The old code to replace
OLD_CODE = '''            # Extract poses with YOLOv26
            results = yolo_model(frame, verbose=False)
            kpts = np.zeros((2, 17, 3), dtype=np.float32)  # Model trained with 2 people (BatchNorm expects 102 elements)
            kpts_visual = []  # For visualization - complete bodies only

            if results and results[0].keypoints is not None and results[0].boxes is not None:
                    kp = results[0].keypoints.data.cpu().numpy()
                    boxes = results[0].boxes.xyxy.cpu().numpy()

                    # Filter: Reject obvious false detections (fists, random objects)
                    # Lenient: just need some upper body keypoints visible
                    valid_indices = []
                    for i in range(len(kp)):
                        skeleton = kp[i][:17, :3]
                        # Count visible keypoints (confidence > 0.3)
                        visible = sum(1 for k in skeleton if k[2] > 0.3)
                        # Check for upper body: head (0) OR shoulders (5,6)
                        has_head = skeleton[0][2] > 0.3
                        has_any_shoulder = skeleton[5][2] > 0.3 or skeleton[6][2] > 0.3
                        # Accept if: at least 5 keypoints AND (head OR shoulder visible)
                        if visible >= 5 and (has_head or has_any_shoulder):
                            valid_indices.append(i)

                    if len(valid_indices) > 0:
                        # Sort valid detections by bbox area (larger = closer)
                        areas = [(boxes[i][2]-boxes[i][0])*(boxes[i][3]-boxes[i][1]) for i in valid_indices]
                        sorted_pairs = sorted(zip(valid_indices, areas), key=lambda x: x[1], reverse=True)

                        # Process ALL detected people (up to 10 for visualization)
                        max_visual = min(len(sorted_pairs), 10)  # Show up to 10 people
                        for vis_idx, (idx, area) in enumerate(sorted_pairs[:max_visual]):
                            skeleton = kp[idx][:17, :3]
                            kpts_visual.append(skeleton)  # Add ALL for visualization
                            # Only use top 2 for model (BatchNorm trained with M=2)
                            if vis_idx < 2:
                                kpts[vis_idx] = skeleton'''

if __name__ == "__main__":
    import sys

    # Read the current file
    with open('/app/nexaravision/smart_veto_final.py', 'r') as f:
        content = f.read()

    # Check if old code exists
    if OLD_CODE in content:
        # Replace with patched code
        new_content = content.replace(OLD_CODE, PATCHED_CODE)

        # Write back
        with open('/app/nexaravision/smart_veto_final.py', 'w') as f:
            f.write(new_content)

        print("SUCCESS: Server patched with IoU-based NMS deduplication")
        print("- IoU threshold: 0.5 (50% overlap = same person)")
        print("- Up to 10 unique people will be visualized")
        sys.exit(0)
    else:
        print("WARNING: Old code block not found - checking if already patched")
        if "calc_iou" in content and "IOU_THRESHOLD" in content:
            print("Server already has IoU-based NMS - no changes needed")
            sys.exit(0)
        else:
            print("ERROR: Could not find expected code block")
            sys.exit(1)
