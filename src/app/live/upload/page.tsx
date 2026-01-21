'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DetectionResult } from '@/components/live/DetectionResult';
import { uploadWithProgress } from '@/lib/api';
import type { DetectionResult as DetectionResultType } from '@/types/detection';

export default function FileUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DetectionResultType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const data = await uploadWithProgress(file, (progressValue) => {
        setProgress(progressValue);
      });

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv'],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
          Upload Video for Detection
        </h1>
        <p className="text-[var(--text-secondary)]">
          Upload your CCTV footage to analyze violence probability using AI
        </p>
      </div>

      {/* Upload Area */}
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-[var(--accent-blue)] bg-blue-950/30'
            : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--accent-blue)]'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <Upload className="mx-auto h-16 w-16 text-[var(--accent-blue)]" />
            <div>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                {isDragActive ? 'Drop video here' : 'Drag & drop video, or click to browse'}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                MP4, AVI, MOV, MKV up to 500MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploading && (
        <Card className="mt-6 border-[var(--border)] bg-[var(--card-bg)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Processing Video</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span>{progress < 100 ? 'Uploading...' : 'Analyzing frames...'}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-gray-700" />
            <p className="text-xs text-[var(--text-secondary)]">
              This may take a few seconds depending on video length
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mt-6 border-[var(--danger-red)]">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {result && !uploading && (
        <Alert className="mt-6 border-[var(--success-green)] bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 text-[var(--success-green)]" />
          <AlertDescription className="text-[var(--success-green)]">
            Video analysis completed successfully
          </AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {result && <DetectionResult result={result} />}
    </div>
  );
}
