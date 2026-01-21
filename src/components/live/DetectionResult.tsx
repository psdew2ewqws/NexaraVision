'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, AlertCircle, Shield, AlertTriangle } from 'lucide-react';
import type { DetectionResult as DetectionResultType } from '@/types/detection';
import { getConfidenceColor } from '@/lib/utils';

interface DetectionResultProps {
  result: DetectionResultType;
}

export function DetectionResult({ result }: DetectionResultProps) {
  const violencePercentage = Math.round(result.violenceProbability * 100);
  const nonViolencePercentage = result.perClassScores
    ? Math.round(result.perClassScores.nonViolence * 100)
    : 100 - violencePercentage;
  const isHighRisk = violencePercentage > 85;
  const isMediumRisk = violencePercentage > 50 && violencePercentage <= 85;

  return (
    <Card className="mt-6 border-[var(--border)] bg-[var(--card-bg)]">
      <CardHeader>
        <CardTitle className="text-[var(--text-primary)]">Detection Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Violence vs Non-Violence Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Violence Score */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-red-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="text-sm font-medium text-red-400">Violence</span>
            </div>
            <div className="text-3xl font-bold text-red-400 mb-2">
              {violencePercentage}%
            </div>
            <Progress
              value={violencePercentage}
              className="h-2 bg-gray-700"
              indicatorClassName="bg-red-500"
            />
          </div>

          {/* Non-Violence Score */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium text-green-400">Non-Violence</span>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {nonViolencePercentage}%
            </div>
            <Progress
              value={nonViolencePercentage}
              className="h-2 bg-gray-700"
              indicatorClassName="bg-green-500"
            />
          </div>
        </div>

        {/* Overall Prediction */}
        <div className="bg-gray-800/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              AI Prediction
            </span>
            <Badge
              variant="outline"
              className={`text-base px-3 py-1 ${
                result.prediction === 'violence'
                  ? 'border-red-500 text-red-400 bg-red-500/10'
                  : 'border-green-500 text-green-400 bg-green-500/10'
              }`}
            >
              {result.prediction === 'violence' ? 'VIOLENCE DETECTED' : 'NO VIOLENCE'}
            </Badge>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={result.confidence === 'High' ? 'destructive' : 'secondary'}
            className={getConfidenceColor(result.confidence)}
          >
            {result.confidence} Confidence
          </Badge>
          {isHighRisk && (
            <Badge variant="destructive" className="bg-[var(--danger-red)]">
              <AlertCircle className="mr-1 h-3 w-3" />
              High Risk
            </Badge>
          )}
          {isMediumRisk && (
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Medium Risk
            </Badge>
          )}
          {result.backend && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
              {result.backend.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Performance Metrics */}
        {result.inferenceTimeMs && (
          <div className="bg-gray-800/30 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Inference Time</span>
            <span className="text-sm font-mono text-blue-400">{result.inferenceTimeMs.toFixed(2)}ms</span>
          </div>
        )}

        {/* Timeline with Peak Violence Moment */}
        {result.peakTimestamp && (
          <>
            <Separator className="bg-[var(--border)]" />
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Peak Violence at {result.peakTimestamp}</span>
            </div>
          </>
        )}

        {/* Frame Analysis Timeline */}
        {result.frameAnalysis && result.frameAnalysis.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">
              Frame-by-Frame Analysis
            </h4>
            <div className="h-16 bg-gray-800 rounded-lg relative overflow-hidden">
              {result.frameAnalysis.map((frame, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${(idx / result.frameAnalysis!.length) * 100}%`,
                    width: `${(1 / result.frameAnalysis!.length) * 100}%`,
                    backgroundColor: `rgba(239, 68, 68, ${frame.violenceProb})`,
                  }}
                  title={`Frame ${frame.frameIndex}: ${Math.round(frame.violenceProb * 100)}%`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-[var(--text-secondary)]">
              <span>Start</span>
              <span>End</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
