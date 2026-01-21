# NexaraVision - Frontend Application

Next.js 14 frontend for NexaraVision AI violence detection platform.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React hooks + Zustand (lightweight)
- **Data Fetching**: React Query
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/
│   ├── live/
│   │   ├── upload/page.tsx      # File upload detection
│   │   ├── camera/page.tsx      # Live single-camera
│   │   └── multi-camera/page.tsx # Grid segmentation (coming soon)
│   ├── layout.tsx
│   └── page.tsx                 # Homepage
├── components/
│   ├── ui/                      # shadcn components
│   └── live/
│       ├── DetectionResult.tsx  # Results display component
│       └── ...
├── lib/
│   ├── api.ts                   # API client functions
│   └── utils.ts                 # Utility functions
└── types/
    └── detection.ts             # TypeScript interfaces
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` to set your API endpoints:
   - `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:3001/api)
   - `NEXT_PUBLIC_WS_URL`: WebSocket URL (default: ws://localhost:3001/ws/live)

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**: Navigate to [http://localhost:3000](http://localhost:3000)

## Features

### Phase 1 (Current - Week 3-4)

- ✅ **File Upload Detection**: Drag-and-drop video upload with AI analysis
- ✅ **Live Camera Detection**: Real-time webcam violence detection
- ✅ **Dark Theme UI**: PRD-compliant dark blue gradient design
- ✅ **Responsive Design**: Mobile-first approach

### Phase 2 (Coming Soon)

- ⏳ **Multi-Camera Grid**: Screen recording segmentation (Weeks 6-10)
- ⏳ **Dashboard**: Incident review and analytics
- ⏳ **Alert System**: Email, SMS, webhook notifications

## Design System

The application follows NexaraVision's design system:

### Color Palette

```css
--background: linear-gradient(135deg, #000000, #0a1929, #1a2942);
--card-bg: #1e293b;
--border: rgba(59, 130, 246, 0.3);
--text-primary: #e2e8f0;
--text-secondary: #94a3b8;
--accent-blue: #60a5fa;
--success-green: #22c55e;
--danger-red: #ef4444;
--warning-yellow: #f59e0b;
```

### Typography

- **Primary Font**: Geist Sans
- **Monospace Font**: Geist Mono

## API Integration

### File Upload Endpoint

```typescript
POST /api/upload
Content-Type: multipart/form-data

Request:
{
  video: File
}

Response:
{
  success: boolean,
  data: {
    violenceProbability: number,
    confidence: 'Low' | 'Medium' | 'High',
    peakTimestamp: string,
    frameAnalysis: FrameAnalysis[]
  }
}
```

### WebSocket Live Detection

```typescript
// Connect
const ws = new WebSocket('ws://localhost:3001/ws/live');

// Send frames
ws.send(JSON.stringify({
  type: 'analyze_frames',
  frames: string[] // Base64 encoded images
}));

// Receive results
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // { result: { violenceProbability, confidence } }
};
```

## Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type checking
npx tsc --noEmit
```

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader optimized
- Color contrast ratios meet standards

## Performance Targets

- **File Upload Latency**: < 5s for 30-second video
- **Live Detection Latency**: < 500ms end-to-end
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s

## License

Proprietary - NexaraVision 2025
