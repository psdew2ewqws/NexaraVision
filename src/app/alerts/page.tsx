'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useIncidents, updateIncidentStatus, type Incident } from '@/hooks/useSupabase';
import { PageLoader } from '@/components/ui/page-loader';

// Icons
const Icons = {
  bell: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.574 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.574-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  play: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  ),
  video: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  alert: (
    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  loader: (
    <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
};

const translations = {
  en: {
    title: 'Security Alerts',
    subtitle: 'Monitor and manage security incidents in real-time',
    stats: {
      active: 'Active Alerts',
      responding: 'Responding',
      resolvedToday: 'Resolved Today',
      total: 'Total Incidents',
    },
    filters: {
      all: 'All',
      detected: 'Detected',
      acknowledged: 'Acknowledged',
      responding: 'Responding',
      resolved: 'Resolved',
      falsePositive: 'False Positive',
    },
    status: {
      detected: 'Detected',
      acknowledged: 'Acknowledged',
      responding: 'Responding',
      resolved: 'Resolved',
      false_positive: 'False Positive',
    },
    severity: { high: 'High', medium: 'Medium', low: 'Low' },
    actions: {
      view: 'View Details',
      acknowledge: 'Acknowledge',
      resolve: 'Resolve',
      markFalse: 'False Positive',
      playRecording: 'Play Recording',
      download: 'Download',
    },
    modal: {
      title: 'Incident Details',
      location: 'Location',
      camera: 'Camera',
      time: 'Detection Time',
      confidence: 'Confidence',
      model: 'Model Used',
      recording: 'Incident Recording',
      notes: 'Resolution Notes',
    },
    empty: 'No incidents found',
    noRecording: 'No recording available',
    error: 'Error loading alerts',
    violence: 'Violence Detected',
    close: 'Close',
  },
  ar: {
    title: 'تنبيهات الأمان',
    subtitle: 'مراقبة وإدارة الحوادث الأمنية في الوقت الفعلي',
    stats: {
      active: 'التنبيهات النشطة',
      responding: 'جاري الاستجابة',
      resolvedToday: 'تم الحل اليوم',
      total: 'إجمالي الحوادث',
    },
    filters: {
      all: 'الكل',
      detected: 'مكتشف',
      acknowledged: 'تم الإقرار',
      responding: 'جاري الاستجابة',
      resolved: 'تم الحل',
      falsePositive: 'إنذار خاطئ',
    },
    status: {
      detected: 'تم الكشف',
      acknowledged: 'تم الإقرار',
      responding: 'جاري الاستجابة',
      resolved: 'تم الحل',
      false_positive: 'إنذار خاطئ',
    },
    severity: { high: 'عالي', medium: 'متوسط', low: 'منخفض' },
    actions: {
      view: 'عرض التفاصيل',
      acknowledge: 'إقرار',
      resolve: 'حل',
      markFalse: 'إنذار خاطئ',
      playRecording: 'تشغيل التسجيل',
      download: 'تحميل',
    },
    modal: {
      title: 'تفاصيل الحادثة',
      location: 'الموقع',
      camera: 'الكاميرا',
      time: 'وقت الكشف',
      confidence: 'نسبة الثقة',
      model: 'النموذج المستخدم',
      recording: 'تسجيل الحادثة',
      notes: 'ملاحظات الحل',
    },
    empty: 'لا توجد حوادث',
    noRecording: 'لا يوجد تسجيل',
    error: 'خطأ في تحميل التنبيهات',
    violence: 'كشف عنف',
    close: 'إغلاق',
  },
};

export default function AlertsPage() {
  const { locale, isRTL } = useLanguage();
  const { user } = useAuth();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  const { incidents, loading, error, refresh } = useIncidents(100);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  // Close modal on Escape key
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showModal) {
      setShowModal(false);
    }
  }, [showModal]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  // Stats
  const stats = {
    active: incidents.filter(i => i.status === 'detected' || i.status === 'acknowledged').length,
    responding: incidents.filter(i => i.status === 'responding').length,
    resolvedToday: incidents.filter(i => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return (i.status === 'resolved' || i.status === 'false_positive') &&
        new Date(i.detected_at) >= today;
    }).length,
    total: incidents.length,
  };

  // Confidence is stored as 0-100 percentage in database
  const getSeverity = (confidence: number) => {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  };

  const severityColors: Record<string, string> = {
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    medium: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  const statusColors: Record<string, string> = {
    detected: 'text-red-400 bg-red-500/10',
    acknowledged: 'text-orange-400 bg-orange-500/10',
    responding: 'text-yellow-400 bg-yellow-500/10',
    resolved: 'text-emerald-400 bg-emerald-500/10',
    false_positive: 'text-slate-400 bg-slate-500/10',
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Just now';
    if (diffMins < 60) return locale === 'ar' ? `${diffMins} دقيقة` : `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return locale === 'ar' ? `${diffHours} ساعة` : `${diffHours}h ago`;
    return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US');
  };

  const handleStatusUpdate = async (id: string, status: 'acknowledged' | 'responding' | 'resolved' | 'false_positive') => {
    if (!user) return;
    setUpdatingId(id);
    await updateIncidentStatus(id, status, user.id);
    refresh(); // Refresh incident list after status update
    setUpdatingId(null);
  };

  const filteredIncidents = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mx-auto mb-4">{Icons.alert}</div>
          <p className="text-red-400 mb-2">{t.error}</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-slate-950 p-3 sm:p-6', isRTL && 'rtl')}>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">{t.title}</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">{t.subtitle}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { key: 'active', icon: Icons.bell, color: 'text-red-400', value: stats.active },
            { key: 'responding', icon: Icons.clock, color: 'text-orange-400', value: stats.responding },
            { key: 'resolvedToday', icon: Icons.check, color: 'text-emerald-400', value: stats.resolvedToday },
            { key: 'total', icon: Icons.shield, color: 'text-blue-400', value: stats.total },
          ].map(({ key, icon, color, value }) => (
            <div key={key} className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn('p-2 sm:p-2.5 rounded-lg bg-slate-800/50', color)}>{icon}</div>
                <div>
                  <div className="text-xl sm:text-2xl font-semibold text-white">{value}</div>
                  <div className="text-xs sm:text-sm text-slate-400">{t.stats[key as keyof typeof t.stats]}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters - Scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          {['all', 'detected', 'acknowledged', 'responding', 'resolved', 'false_positive'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-3 sm:px-4 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors active:scale-95 active:bg-blue-700',
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white active:bg-slate-700'
              )}
            >
              {status === 'all' ? t.filters.all : t.status[status as keyof typeof t.status]}
            </button>
          ))}
        </div>

        {/* Incidents List */}
        <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl overflow-hidden">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <div className="mx-auto mb-4 opacity-50">{Icons.check}</div>
              <p>{t.empty}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredIncidents.map((incident) => {
                const severity = getSeverity(incident.confidence);
                return (
                  <div key={incident.id} className="p-3 sm:p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      {/* Left: Info */}
                      <div className="flex items-start gap-2 sm:gap-4 flex-1">
                        {/* Thumbnail/Recording indicator - Hidden on small screens */}
                        <div className="relative w-16 h-12 sm:w-24 sm:h-16 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 hidden sm:block">
                          {incident.thumbnail_url ? (
                            <img src={incident.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              {Icons.video}
                            </div>
                          )}
                          {incident.video_url && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <div className="text-white">{Icons.play}</div>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('px-2 py-0.5 rounded text-xs font-medium uppercase border', severityColors[severity])}>
                              {t.severity[severity as keyof typeof t.severity]}
                            </span>
                            <span className="text-white font-medium">{t.violence}</span>
                          </div>
                          <p className="text-sm text-slate-400 truncate">
                            {incident.cameras?.name || incident.cameras?.name_ar || 'Unknown Camera'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {Math.round(incident.confidence)}% confidence
                          </p>
                        </div>
                      </div>

                      {/* Right: Status & Time */}
                      <div className="text-right flex-shrink-0">
                        <span className={cn('inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-1', statusColors[incident.status])}>
                          {t.status[incident.status as keyof typeof t.status]}
                        </span>
                        <p className="text-xs text-slate-500">{formatTime(incident.detected_at)}</p>
                      </div>
                    </div>

                    {/* Actions - Wrap on mobile */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                      <button
                        onClick={() => { setSelectedIncident(incident); setShowModal(true); }}
                        aria-label={t.actions.view}
                        className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white text-xs sm:text-sm rounded-lg transition-colors active:scale-95"
                      >
                        {Icons.eye}
                        <span className="hidden sm:inline">{t.actions.view}</span>
                      </button>

                      {incident.status === 'detected' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(incident.id, 'acknowledged')}
                            disabled={updatingId === incident.id}
                            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-orange-600/20 hover:bg-orange-600/30 active:bg-orange-600/40 text-orange-400 text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50 active:scale-95"
                          >
                            {t.actions.acknowledge}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(incident.id, 'resolved')}
                            disabled={updatingId === incident.id}
                            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-emerald-600/20 hover:bg-emerald-600/30 active:bg-emerald-600/40 text-emerald-400 text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50 active:scale-95"
                          >
                            {t.actions.resolve}
                          </button>
                        </>
                      )}

                      {(incident.status === 'acknowledged' || incident.status === 'responding') && (
                        <button
                          onClick={() => handleStatusUpdate(incident.id, 'resolved')}
                          disabled={updatingId === incident.id}
                          className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-emerald-600/20 hover:bg-emerald-600/30 active:bg-emerald-600/40 text-emerald-400 text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50 active:scale-95"
                        >
                          {t.actions.resolve}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Modal - Mobile optimized */}
        {showModal && selectedIncident && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="incident-modal-title"
              className="bg-slate-900 border border-white/[0.08] rounded-t-xl sm:rounded-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] sticky top-0 bg-slate-900 z-10">
                <h2 id="incident-modal-title" className="text-base sm:text-lg font-medium text-white">{t.modal.title}</h2>
                <button
                  onClick={() => setShowModal(false)}
                  aria-label={t.close}
                  className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-white/[0.06] active:bg-white/[0.1] text-slate-400 hover:text-white transition-colors active:scale-95 flex items-center justify-center"
                >
                  {Icons.x}
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
                {/* Severity & Status */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className={cn('px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium uppercase border', severityColors[getSeverity(selectedIncident.confidence)])}>
                    {t.severity[getSeverity(selectedIncident.confidence) as keyof typeof t.severity]}
                  </span>
                  <span className="text-base sm:text-xl font-semibold text-white">{t.violence}</span>
                  <span className={cn('px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium', statusColors[selectedIncident.status])}>
                    {t.status[selectedIncident.status as keyof typeof t.status]}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-800/50 rounded-xl">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">{t.modal.location}</p>
                    <p className="text-white font-medium">
                      {selectedIncident.locations?.name || selectedIncident.locations?.name_ar || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">{t.modal.camera}</p>
                    <p className="text-white font-medium">
                      {selectedIncident.cameras?.name || selectedIncident.cameras?.name_ar || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">{t.modal.time}</p>
                    <p className="text-white font-medium">
                      {new Date(selectedIncident.detected_at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm mb-1">{t.modal.confidence}</p>
                    <p className="text-white font-medium">{Math.round(selectedIncident.confidence)}%</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 text-sm mb-1">{t.modal.model}</p>
                    <p className="text-white font-medium">{selectedIncident.model_used || 'Violence Detection AI'}</p>
                  </div>
                </div>

                {/* Video Recording */}
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">{t.modal.recording}</h3>
                  <div className="aspect-video bg-slate-800 rounded-xl overflow-hidden relative">
                    {selectedIncident.video_url ? (
                      <video
                        src={selectedIncident.video_url}
                        controls
                        className="w-full h-full object-contain"
                        poster={selectedIncident.thumbnail_url ?? undefined}
                      />
                    ) : selectedIncident.thumbnail_url ? (
                      <img src={selectedIncident.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                        <div className="mb-2">{Icons.video}</div>
                        <p className="text-sm">{t.noRecording}</p>
                      </div>
                    )}
                  </div>

                  {/* Download button */}
                  {selectedIncident.video_url && (
                    <a
                      href={selectedIncident.video_url}
                      download
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
                    >
                      {Icons.download}
                      {t.actions.download}
                    </a>
                  )}
                </div>

                {/* Resolution Notes */}
                {selectedIncident.resolution_notes && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-emerald-400 text-sm font-medium mb-2">{t.modal.notes}</p>
                    <p className="text-slate-300">{selectedIncident.resolution_notes}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer - Actions - Mobile optimized */}
              {selectedIncident.status !== 'resolved' && selectedIncident.status !== 'false_positive' && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 border-t border-white/[0.06] sticky bottom-0 bg-slate-900">
                  {selectedIncident.status === 'detected' && (
                    <button
                      onClick={() => { handleStatusUpdate(selectedIncident.id, 'acknowledged'); setShowModal(false); }}
                      className="flex-1 px-4 py-3 min-h-[48px] bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors active:scale-95"
                    >
                      {t.actions.acknowledge}
                    </button>
                  )}
                  <button
                    onClick={() => { handleStatusUpdate(selectedIncident.id, 'resolved'); setShowModal(false); }}
                    className="flex-1 px-4 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors active:scale-95"
                  >
                    {t.actions.resolve}
                  </button>
                  <button
                    onClick={() => { handleStatusUpdate(selectedIncident.id, 'false_positive'); setShowModal(false); }}
                    className="flex-1 px-4 py-3 min-h-[48px] bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors active:scale-95"
                  >
                    {t.actions.markFalse}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
