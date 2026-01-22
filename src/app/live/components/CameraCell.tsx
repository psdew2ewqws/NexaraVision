'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Camera } from 'lucide-react';

interface CameraCellProps {
  id: string;
  label: string;
  violenceProb: number;
  imageData?: string;
  isActive: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CameraCell({ id: _id, label, violenceProb, imageData, isActive }: CameraCellProps) {
  const isViolent = violenceProb > 85;
  const isWarning = violenceProb > 60 && violenceProb <= 85;

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${
        isViolent
          ? 'ring-4 ring-[var(--danger-red)] animate-pulse'
          : isWarning
          ? 'ring-2 ring-yellow-500'
          : 'border-[var(--border)]'
      } ${!isActive ? 'opacity-50' : ''}`}
    >
      <CardContent className="p-0">
        {/* Video/Image Display */}
        <div className="relative aspect-video bg-gray-900">
          {imageData ? (
            <img
              src={imageData}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="h-12 w-12 text-gray-600" />
            </div>
          )}

          {/* Violence Alert Badge */}
          {isViolent && (
            <div className="absolute top-2 right-2">
              <Badge variant="destructive" className="bg-[var(--danger-red)] animate-pulse">
                <AlertCircle className="h-3 w-3 mr-1" />
                ALERT
              </Badge>
            </div>
          )}

          {/* Camera Label */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-black/70 text-white border-none">
              {label}
            </Badge>
          </div>

          {/* Inactive Overlay */}
          {!isActive && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <p className="text-white text-sm">Waiting for stream...</p>
            </div>
          )}
        </div>

        {/* Detection Status Bar */}
        {isActive && (
          <div className="p-2 bg-gray-800/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Violence Probability</span>
              <span
                className={`text-sm font-bold ${
                  isViolent
                    ? 'text-[var(--danger-red)]'
                    : isWarning
                    ? 'text-yellow-500'
                    : 'text-[var(--success-green)]'
                }`}
              >
                {violenceProb}%
              </span>
            </div>
            <Progress
              value={violenceProb}
              className="h-1 bg-gray-700"
              indicatorClassName={
                isViolent
                  ? 'bg-[var(--danger-red)]'
                  : isWarning
                  ? 'bg-yellow-500'
                  : 'bg-[var(--success-green)]'
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
