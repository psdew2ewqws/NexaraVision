'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import type { DetectionEvent } from '@/hooks/useDetectionHistory';

export interface AlertManagerProps {
  pendingAlerts: DetectionEvent[];
  onAcknowledge: (id: string, notes?: string) => void;
  onDismiss: (id: string, notes?: string) => void;
  onEscalate: (id: string, notes?: string) => void;
  onReplay: (event: DetectionEvent) => void;
}

export function AlertManager({
  pendingAlerts,
  onAcknowledge,
  onDismiss,
  onEscalate,
  onReplay,
}: AlertManagerProps) {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleAction = (
    action: 'acknowledge' | 'dismiss' | 'escalate',
    id: string
  ) => {
    switch (action) {
      case 'acknowledge':
        onAcknowledge(id, notes);
        break;
      case 'dismiss':
        onDismiss(id, notes);
        break;
      case 'escalate':
        onEscalate(id, notes);
        break;
    }

    setSelectedAlert(null);
    setNotes('');
  };

  // Utility functions for future alert styling - currently unused
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getAlertColor = (confidence: number) => {
    if (confidence >= 0.9) return 'border-red-500 bg-red-950/30';
    if (confidence >= 0.8) return 'border-orange-500 bg-orange-950/30';
    return 'border-yellow-500 bg-yellow-950/30';
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getAlertIcon = (confidence: number) => {
    if (confidence >= 0.9)
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (confidence >= 0.8)
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const urgentAlerts = pendingAlerts.filter((a) => a.confidence >= 0.9);
  const highAlerts = pendingAlerts.filter(
    (a) => a.confidence >= 0.8 && a.confidence < 0.9
  );
  const mediumAlerts = pendingAlerts.filter((a) => a.confidence < 0.8);

  return (
    <Card className="border-[var(--border)] bg-[var(--card-bg)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <AlertCircle className="h-5 w-5" />
          Alert Management
          {pendingAlerts.length > 0 && (
            <Badge
              variant="destructive"
              className="ml-auto bg-[var(--danger-red)]"
            >
              {pendingAlerts.length} Pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {pendingAlerts.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-[var(--success-green)] opacity-50" />
            <p>No pending alerts</p>
            <p className="text-sm mt-2">All detections have been reviewed</p>
          </div>
        ) : (
          <>
            {/* Urgent Alerts */}
            {urgentAlerts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 animate-pulse" />
                  Urgent ({urgentAlerts.length})
                </h3>
                {urgentAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    isSelected={selectedAlert === alert.id}
                    onSelect={() => setSelectedAlert(alert.id)}
                    onAction={handleAction}
                    onReplay={onReplay}
                    notes={notes}
                    setNotes={setNotes}
                  />
                ))}
              </div>
            )}

            {/* High Priority Alerts */}
            {highAlerts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-orange-500 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  High Priority ({highAlerts.length})
                </h3>
                {highAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    isSelected={selectedAlert === alert.id}
                    onSelect={() => setSelectedAlert(alert.id)}
                    onAction={handleAction}
                    onReplay={onReplay}
                    notes={notes}
                    setNotes={setNotes}
                  />
                ))}
              </div>
            )}

            {/* Medium Priority Alerts */}
            {mediumAlerts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-yellow-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Medium Priority ({mediumAlerts.length})
                </h3>
                {mediumAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    isSelected={selectedAlert === alert.id}
                    onSelect={() => setSelectedAlert(alert.id)}
                    onAction={handleAction}
                    onReplay={onReplay}
                    notes={notes}
                    setNotes={setNotes}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface AlertCardProps {
  alert: DetectionEvent;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: 'acknowledge' | 'dismiss' | 'escalate', id: string) => void;
  onReplay: (event: DetectionEvent) => void;
  notes: string;
  setNotes: (notes: string) => void;
}

function AlertCard({
  alert,
  isSelected,
  onSelect,
  onAction,
  onReplay,
  notes,
  setNotes,
}: AlertCardProps) {
  const alertColor =
    alert.confidence >= 0.9
      ? 'border-red-500 bg-red-950/30'
      : alert.confidence >= 0.8
      ? 'border-orange-500 bg-orange-950/30'
      : 'border-yellow-500 bg-yellow-950/30';

  const confidenceColor =
    alert.confidence >= 0.9
      ? 'text-red-500'
      : alert.confidence >= 0.8
      ? 'text-orange-500'
      : 'text-yellow-500';

  return (
    <Alert className={`${alertColor} cursor-pointer`} onClick={onSelect}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            {alert.confidence >= 0.9 ? (
              <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            ) : alert.confidence >= 0.8 ? (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            <span>Violence Detected</span>
            <span className={`${confidenceColor} font-bold ml-auto`}>
              {Math.round(alert.confidence * 100)}%
            </span>
          </AlertTitle>

          <AlertDescription className="mt-2 space-y-2">
            <div className="text-xs text-[var(--text-secondary)]">
              <p>{new Date(alert.timestamp).toLocaleString()}</p>
              {alert.cameraId && <p>Camera: {alert.cameraId}</p>}
            </div>

            {isSelected && (
              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                {/* Notes */}
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" />
                    Add Notes (Optional)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe the incident or reason for action..."
                    className="bg-gray-900/50 border-[var(--border)] text-sm h-20"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReplay(alert);
                    }}
                    className="flex-1 border-[var(--border)]"
                  >
                    Replay
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction('dismiss', alert.id);
                    }}
                    className="flex-1 border-[var(--border)] hover:bg-gray-700"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction('acknowledge', alert.id);
                    }}
                    className="flex-1 border-[var(--border)] hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Acknowledge
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction('escalate', alert.id);
                    }}
                    className="flex-1 bg-[var(--danger-red)] hover:bg-red-600"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Escalate
                  </Button>
                </div>
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
