'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, MapPin, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAlertContext, AlertData } from '@/contexts/AlertContext';
import { alertLogger as log } from '@/lib/logger';

export function AlertNotification() {
  const { alerts, dismissAlert, acknowledgeAlert, realtimeStatus, triggerTestAlert } = useAlertContext();
  const { locale, isRTL } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  // Show connection status indicator (click to toggle details)
  const statusColors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
  };

  // Always show the status indicator even when no alerts
  if (alerts.length === 0) {
    return (
      <div className={cn(
        "fixed top-4 z-50",
        isRTL ? "left-4" : "right-4"
      )}>
        <div
          className="flex items-center gap-2 px-3 py-2 bg-black/80 rounded-full cursor-pointer hover:bg-black/90 transition-colors"
          onClick={() => setShowStatus(!showStatus)}
        >
          <div className={cn("w-2 h-2 rounded-full", statusColors[realtimeStatus])} />
          {showStatus && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              className="text-xs text-white whitespace-nowrap overflow-hidden"
            >
              {realtimeStatus === 'connected' ? (locale === 'ar' ? 'متصل' : 'Connected') :
               realtimeStatus === 'connecting' ? (locale === 'ar' ? 'جاري الاتصال...' : 'Connecting...') :
               realtimeStatus === 'error' ? (locale === 'ar' ? 'خطأ' : 'Error') :
               (locale === 'ar' ? 'غير متصل' : 'Disconnected')}
            </motion.span>
          )}
        </div>
        {showStatus && realtimeStatus === 'connected' && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={triggerTestAlert}
            className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            {locale === 'ar' ? 'تنبيه تجريبي' : 'Test Alert'}
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed top-4 z-50",
      isRTL ? "left-4" : "right-4"
    )}>
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="mb-3"
          >
            <motion.div
              className={cn(
                "relative overflow-hidden rounded-2xl bg-black text-white shadow-2xl",
                "border border-red-500/30",
                expanded === alert.id ? "w-[360px]" : "w-[280px]"
              )}
              animate={{
                width: expanded === alert.id ? 360 : 280,
                height: expanded === alert.id ? 200 : 64,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {/* Pulsing background effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Compact View */}
              <motion.div
                className={cn(
                  "relative flex items-center gap-3 p-3 cursor-pointer",
                  expanded === alert.id && "border-b border-white/10"
                )}
                onClick={() => setExpanded(expanded === alert.id ? null : alert.id)}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-red-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-400">
                    {locale === 'ar' ? 'تم اكتشاف عنف!' : 'Violence Detected!'}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">
                    {locale === 'ar' && alert.camera_ar ? alert.camera_ar : alert.camera}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {Math.round(alert.confidence)}%
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                    className="p-1 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="h-4 w-4 text-neutral-400" />
                  </button>
                </div>
              </motion.div>

              {/* Expanded View */}
              <AnimatePresence>
                {expanded === alert.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {locale === 'ar' && alert.location_ar ? alert.location_ar : alert.location}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                      <Clock className="h-4 w-4" />
                      <span>
                        {alert.timestamp.toLocaleTimeString(locale === 'ar' ? 'ar-JO' : 'en-US')}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className={cn(
                          "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                          alert.status === 'acknowledged'
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        )}
                      >
                        <Shield className="h-4 w-4 inline mr-2" />
                        {alert.status === 'acknowledged'
                          ? (locale === 'ar' ? 'تم التأكيد' : 'Acknowledged')
                          : (locale === 'ar' ? 'تأكيد' : 'Acknowledge')
                        }
                      </button>
                      <button
                        onClick={() => {
                          // Navigate to alerts page to see full details
                          window.location.href = '/alerts';
                        }}
                        className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        {locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Legacy helper - kept for backwards compatibility but now uses context
export function triggerAlert(_alert: Omit<AlertData, 'id' | 'timestamp' | 'incident_id'> & { incident_id?: string }) {
  // This is now a no-op since we use Supabase realtime
  // Alerts are automatically triggered when incidents are created in the database
  log.warn('[AlertNotification] triggerAlert is deprecated - use Supabase INSERT instead');
}
