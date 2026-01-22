# NexaraVision - Quick Reference Card

## Selected Model

| Setting | Value |
|---------|-------|
| **Model** | `STGCNPP_Kaggle+NTU` |
| **File** | `STGCNPP_Kaggle_NTU.pth` |
| **Threshold** | `0.90` (90%) |
| **Training Accuracy** | 94.56% |
| **Test Score** | 4/4 correct, 0 FP |

## Why This Model?

| Video Type | Confidence | Result |
|------------|------------|--------|
| Violence | 97.4% | ✓ Detected (above 90%) |
| Non-Violence | 7.6% | ✓ Rejected (below 90%) |
| Hand gestures | 83.6% | ✓ Rejected (below 90%) |
| Normal activity | 0.5% | ✓ Rejected (below 90%) |

## Server Access

```bash
# SSH
ssh -p 14039 root@79.160.189.79

# WebSocket
ws://79.160.189.79:14082/ws/live   # HTTP
wss://79.160.189.79:14033/ws/live  # HTTPS
```

## Key Files

```
/app/nexaravision/models/combined/STGCNPP_Kaggle_NTU.pth  # Model
/app/nexaravision/models/yolo26m-pose.pt                  # YOLO
/app/nexaravision/realtime_v39_trained.py                 # Server
```

## Detection Logic

```python
if confidence >= 0.90:
    trigger_alert()
else:
    no_alert()
```

## Excluded Models

- `*_NTU120` models - Domain mismatch (predict 0% on everything)
- `MSG3D_Kaggle+NTU` - Too many false positives (90.7% on non-violence)
