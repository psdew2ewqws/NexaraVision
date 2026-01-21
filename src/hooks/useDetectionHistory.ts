/**
 * React Hook for Detection History Management
 *
 * Provides IndexedDB-backed history storage for:
 * - Detection timeline
 * - Incident replay
 * - Alert management
 */

import { useState, useEffect, useCallback } from 'react';

export interface DetectionEvent {
  id: string;
  timestamp: number;
  cameraId?: string;
  violenceProbability: number;
  confidence: number;
  frameData?: string; // Base64 image
  clipData?: string[]; // 10-second clip frames
  status: 'pending' | 'acknowledged' | 'dismissed' | 'escalated';
  notes?: string;
  operator?: string;
}

export interface UseDetectionHistoryOptions {
  maxEvents?: number;
  autoSave?: boolean;
  storageKey?: string;
}

export interface UseDetectionHistoryReturn {
  events: DetectionEvent[];
  addEvent: (event: Omit<DetectionEvent, 'id' | 'timestamp'>) => void;
  updateEvent: (id: string, updates: Partial<DetectionEvent>) => void;
  deleteEvent: (id: string) => void;
  getEvent: (id: string) => DetectionEvent | undefined;
  getRecentEvents: (count: number) => DetectionEvent[];
  getEventsByStatus: (status: DetectionEvent['status']) => DetectionEvent[];
  clearEvents: () => void;
  exportEvents: () => void;
}

/**
 * Detection History Hook
 */
export function useDetectionHistory(
  options: UseDetectionHistoryOptions = {}
): UseDetectionHistoryReturn {
  const {
    maxEvents = 1000,
    autoSave = true,
    storageKey = 'nexara-detection-history',
  } = options;

  const [events, setEvents] = useState<DetectionEvent[]>([]);

  // Load events from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setEvents(parsed);
      }
    } catch (err) {
      console.error('Failed to load detection history:', err);
    }
  }, [storageKey]);

  // Auto-save events to localStorage
  useEffect(() => {
    if (autoSave && events.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(events));
      } catch (err) {
        console.error('Failed to save detection history:', err);
      }
    }
  }, [events, autoSave, storageKey]);

  /**
   * Add new detection event
   */
  const addEvent = useCallback(
    (event: Omit<DetectionEvent, 'id' | 'timestamp'>) => {
      const newEvent: DetectionEvent = {
        ...event,
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      setEvents((prev) => {
        const updated = [newEvent, ...prev];
        // Limit to maxEvents
        return updated.slice(0, maxEvents);
      });
    },
    [maxEvents]
  );

  /**
   * Update existing event
   */
  const updateEvent = useCallback(
    (id: string, updates: Partial<DetectionEvent>) => {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === id ? { ...event, ...updates } : event
        )
      );
    },
    []
  );

  /**
   * Delete event
   */
  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }, []);

  /**
   * Get specific event
   */
  const getEvent = useCallback(
    (id: string) => {
      return events.find((event) => event.id === id);
    },
    [events]
  );

  /**
   * Get recent events
   */
  const getRecentEvents = useCallback(
    (count: number) => {
      return events.slice(0, count);
    },
    [events]
  );

  /**
   * Get events by status
   */
  const getEventsByStatus = useCallback(
    (status: DetectionEvent['status']) => {
      return events.filter((event) => event.status === status);
    },
    [events]
  );

  /**
   * Clear all events
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  /**
   * Export events to JSON file
   */
  const exportEvents = useCallback(() => {
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detection-history-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [events]);

  return {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    getRecentEvents,
    getEventsByStatus,
    clearEvents,
    exportEvents,
  };
}
