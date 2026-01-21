# NexaraVision Frontend - Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd /home/admin/Desktop/NexaraVision/web_app_nextjs
npm install
```

### Step 2: Configure Environment (Optional)
```bash
# Copy environment template
cp .env.local.example .env.local

# Edit if needed (defaults work for local development)
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
# NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws/live
```

### Step 3: Run Development Server
```bash
npm run dev
```

### Step 4: Open Browser
Navigate to: **http://localhost:3000**

---

## What You'll See

### Homepage (/)
- NexaraVision branding
- Three feature cards:
  - **File Upload Detection** → `/live/upload`
  - **Live Camera Detection** → `/live/camera`
  - **Multi-Camera Grid** (Coming Soon)

### File Upload Page (/live/upload)
- Drag & drop video files
- Supported formats: MP4, AVI, MOV, MKV
- Max file size: 500MB
- Upload progress indicator
- Detection results display

**Note**: Requires backend API at `http://localhost:3001/api/upload`

### Live Camera Page (/live/camera)
- Click "Start Live Detection"
- Grant webcam permissions
- Real-time violence probability meter
- Visual alerts when violence detected

**Note**: Requires WebSocket server at `ws://localhost:3001/ws/live`

---

## Backend Integration

The frontend is ready but needs the backend API. Expected endpoints:

### 1. File Upload
```
POST http://localhost:3001/api/upload
Content-Type: multipart/form-data
Body: { video: File }
```

### 2. WebSocket Live Detection
```
WebSocket: ws://localhost:3001/ws/live
```

See `README.md` for full API specifications.

---

## Testing Without Backend

Currently, the frontend will show error messages when backend is not available. Mock integration coming in Phase 2.

---

## Troubleshooting

**Problem**: npm install fails
- **Solution**: Ensure Node.js 18+ is installed

**Problem**: Port 3000 already in use
- **Solution**: Kill existing process or change port:
  ```bash
  PORT=3001 npm run dev
  ```

**Problem**: Webcam not detected
- **Solution**: Grant browser permissions, use HTTPS/localhost only

**Problem**: TypeScript errors
- **Solution**: Run `npx tsc --noEmit` to check types

---

## Development Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Build for production
npm start        # Run production build
npm run lint     # Run ESLint
```

---

## Next Steps

1. **Backend Setup**: Implement NestJS API endpoints
2. **ML Service**: Connect Python FastAPI ML service
3. **Testing**: Full integration testing
4. **Phase 2**: Multi-camera grid implementation

---

**Need Help?** Check `README.md` for detailed documentation.
