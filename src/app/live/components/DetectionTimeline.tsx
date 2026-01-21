'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Clock, Eye, Download } from 'lucide-react';
import type { DetectionEvent } from '@/hooks/useDetectionHistory';

export interface DetectionTimelineProps {
  events: DetectionEvent[];
  onEventClick?: (event: DetectionEvent) => void;
  onExport?: () => void;
  maxHeight?: string;
}

export function DetectionTimeline({
  events,
  onEventClick,
  onExport,
  maxHeight = '500px',
}: DetectionTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'acknowledged' | 'dismissed'>(
    'all'
  );

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((event) => event.status === filter);
  }, [events, filter]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, DetectionEvent[]>();

    filteredEvents.forEach((event) => {
      const date = new Date(event.timestamp).toLocaleDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(event);
    });

    return Array.from(groups.entries()).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  }, [filteredEvents]);

  const getStatusColor = (status: DetectionEvent['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      case 'acknowledged':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      case 'dismissed':
        return 'bg-gray-500/20 text-gray-500 border-gray-500/50';
      case 'escalated':
        return 'bg-red-500/20 text-red-500 border-red-500/50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-red-500';
    if (confidence >= 0.7) return 'text-orange-500';
    return 'text-yellow-500';
  };

  return (
    <Card className="border-[var(--border)] bg-[var(--card-bg)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <Clock className="h-5 w-5" />
            Detection Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="border-[var(--border)]"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4">
          {['all', 'pending', 'acknowledged', 'dismissed'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status as typeof filter)}
              className={
                filter === status
                  ? 'bg-[var(--accent-blue)]'
                  : 'border-[var(--border)]'
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No detection events found</p>
          </div>
        ) : (
          <ScrollArea style={{ height: maxHeight }}>
            <div className="space-y-6">
              {groupedEvents.map(([date, dayEvents]) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 sticky top-0 bg-[var(--card-bg)] py-2 z-10">
                    {date}
                  </h3>
                  <div className="space-y-3">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="relative pl-6 pb-4 border-l-2 border-[var(--border)] last:pb-0"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[var(--danger-red)] border-2 border-[var(--card-bg)]" />

                        {/* Event Card */}
                        <div
                          className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                          onClick={() => onEventClick?.(event)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[var(--text-secondary)]">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                              {event.cameraId && (
                                <Badge variant="outline" className="text-xs">
                                  {event.cameraId}
                                </Badge>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={getStatusColor(event.status)}
                            >
                              {event.status}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                Violence Detected
                              </p>
                              <p
                                className={`text-lg font-bold ${getConfidenceColor(
                                  event.confidence
                                )}`}
                              >
                                {Math.round(event.confidence * 100)}% Confidence
                              </p>
                            </div>

                            {event.clipData && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick?.(event);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Replay
                              </Button>
                            )}
                          </div>

                          {event.notes && (
                            <p className="text-sm text-[var(--text-secondary)] mt-2 italic">
                              {event.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
