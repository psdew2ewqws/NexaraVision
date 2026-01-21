'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid3x3, Monitor } from 'lucide-react';

interface GridControlsProps {
  rows: number;
  cols: number;
  onGridChange: (rows: number, cols: number) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  totalCameras: number;
}

export function GridControls({
  rows,
  cols,
  onGridChange,
  isRecording,
  onStartRecording,
  onStopRecording,
  totalCameras,
}: GridControlsProps) {
  const gridPresets = [
    { label: '2x2', rows: 2, cols: 2 },
    { label: '3x3', rows: 3, cols: 3 },
    { label: '4x4', rows: 4, cols: 4 },
    { label: '5x5', rows: 5, cols: 5 },
    { label: '6x6', rows: 6, cols: 6 },
  ];

  return (
    <Card className="border-[var(--border)] bg-[var(--card-bg)]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            <span>Grid Configuration</span>
          </div>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse bg-[var(--danger-red)]">
              RECORDING
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid Preset Selection */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
            Grid Layout
          </label>
          <div className="flex flex-wrap gap-2">
            {gridPresets.map((preset) => (
              <Button
                key={preset.label}
                variant={rows === preset.rows && cols === preset.cols ? 'default' : 'outline'}
                onClick={() => onGridChange(preset.rows, preset.cols)}
                disabled={isRecording}
                className={
                  rows === preset.rows && cols === preset.cols
                    ? 'bg-[var(--accent-blue)] hover:bg-blue-600'
                    : ''
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Current Grid Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Grid Size</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {rows} x {cols}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Total Cameras</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{totalCameras}</p>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="pt-2">
          {!isRecording ? (
            <Button
              size="lg"
              onClick={onStartRecording}
              className="w-full bg-[var(--accent-blue)] hover:bg-blue-600"
            >
              <Monitor className="mr-2 h-5 w-5" />
              Start Screen Recording
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              onClick={onStopRecording}
              className="w-full bg-[var(--danger-red)] hover:bg-red-600"
            >
              Stop Recording
            </Button>
          )}
        </div>

        {/* Instructions */}
        {!isRecording && (
          <div className="text-xs text-[var(--text-secondary)] space-y-1 p-3 bg-blue-950/20 rounded border border-[var(--accent-blue)]/30">
            <p className="font-medium text-[var(--accent-blue)]">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Select your grid layout (e.g., 3x3 for 9 cameras)</li>
              <li>Click &quot;Start Screen Recording&quot;</li>
              <li>Select the screen/window showing your CCTV grid</li>
              <li>The system will auto-segment into individual cameras</li>
              <li>Real-time violence detection will run on all cameras</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
