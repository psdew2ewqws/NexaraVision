'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { useIncidents, getIncidentMedia, deleteIncident, type Incident, type IncidentMedia } from '@/hooks/useSupabase';

// Simple shadcn components
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { PageLoader } from '@/components/ui/page-loader';

// Lucide icons
import {
  Video,
  Play,
  Calendar,
  AlertTriangle,
  Clock,
  Download,
  X,
  Shield,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Image,
  Images,
  Trash2,
  Loader2,
} from 'lucide-react';

const translations = {
  en: {
    title: 'Recordings',
    subtitle: 'Incident recordings and evidence',
    all: 'All',
    detected: 'Detected',
    resolved: 'Resolved',
    falsePositive: 'False Positive',
    noRecordings: 'No recordings yet',
    noRecordingsDesc: 'Recordings will appear here when incidents are detected',
    goToLive: 'Go to Live Detection',
    confidence: 'Confidence',
    duration: 'Duration',
    camera: 'Camera',
    location: 'Location',
    download: 'Download',
    close: 'Close',
    playRecording: 'Play Recording',
    noVideo: 'No video available',
    screenshots: 'Screenshots',
    timeline: 'Incident Timeline',
    screenshotCount: 'screenshots captured',
    viewAll: 'View All',
    delete: 'Delete',
    deleteConfirm: 'Delete this incident?',
    deleteWarning: 'This will permanently delete this incident and all its media files.',
    cancel: 'Cancel',
    deleting: 'Deleting...',
    status: {
      detected: 'Detected',
      acknowledged: 'Acknowledged',
      responding: 'Responding',
      resolved: 'Resolved',
      false_positive: 'False Positive',
    },
  },
  ar: {
    title: 'التسجيلات',
    subtitle: 'تسجيلات الحوادث والأدلة',
    all: 'الكل',
    detected: 'مكتشف',
    resolved: 'تم الحل',
    falsePositive: 'إنذار خاطئ',
    noRecordings: 'لا توجد تسجيلات',
    noRecordingsDesc: 'ستظهر التسجيلات هنا عند اكتشاف الحوادث',
    goToLive: 'الكشف المباشر',
    confidence: 'الثقة',
    duration: 'المدة',
    camera: 'الكاميرا',
    location: 'الموقع',
    download: 'تحميل',
    close: 'إغلاق',
    playRecording: 'تشغيل التسجيل',
    noVideo: 'لا يوجد فيديو',
    screenshots: 'لقطات الشاشة',
    timeline: 'الجدول الزمني للحادث',
    screenshotCount: 'لقطات ملتقطة',
    viewAll: 'عرض الكل',
    delete: 'حذف',
    deleteConfirm: 'حذف هذا الحادث؟',
    deleteWarning: 'سيؤدي هذا إلى حذف هذا الحادث وجميع ملفات الوسائط الخاصة به نهائياً.',
    cancel: 'إلغاء',
    deleting: 'جاري الحذف...',
    status: {
      detected: 'مكتشف',
      acknowledged: 'تم الإقرار',
      responding: 'جاري الاستجابة',
      resolved: 'تم الحل',
      false_positive: 'إنذار خاطئ',
    },
  },
};

export default function RecordingsPage() {
  const router = useRouter();
  const { locale, isRTL } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  const { incidents, loading, error, refresh } = useIncidents(200);

  const [activeTab, setActiveTab] = useState('all');
  const [selectedRecording, setSelectedRecording] = useState<Incident | null>(null);
  const [incidentMedia, setIncidentMedia] = useState<IncidentMedia | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Handle incident deletion
  const handleDelete = async () => {
    if (!selectedRecording) return;

    setDeleting(true);
    const { error: deleteError } = await deleteIncident(selectedRecording.id);
    setDeleting(false);

    if (deleteError) {
      console.error('[Cameras] Delete failed:', deleteError.message);
      alert('Failed to delete: ' + deleteError.message);
      return;
    }

    // Close modal and refresh list
    setSelectedRecording(null);
    setShowDeleteConfirm(false);
    refresh();
  };

  // Fetch incident media when a recording is selected
  useEffect(() => {
    if (selectedRecording) {
      setLoadingMedia(true);
      setCurrentScreenshotIndex(0);
      setShowDeleteConfirm(false); // Reset delete confirmation
      getIncidentMedia(selectedRecording.id)
        .then((media) => {
          setIncidentMedia(media);
          console.log('[Cameras] Loaded incident media:', media);
        })
        .catch((err) => {
          console.error('[Cameras] Error loading media:', err);
          setIncidentMedia(null);
        })
        .finally(() => setLoadingMedia(false));
    } else {
      setIncidentMedia(null);
    }
  }, [selectedRecording]);

  // Filter incidents by tab (only show ones with video/thumbnail)
  const filteredIncidents = useMemo(() => {
    // Get incidents that have recordings
    const recordedIncidents = incidents.filter(i => i.video_url || i.thumbnail_url);

    if (activeTab === 'all') return recordedIncidents;
    if (activeTab === 'detected') return recordedIncidents.filter(i => i.status === 'detected' || i.status === 'acknowledged' || i.status === 'responding');
    if (activeTab === 'resolved') return recordedIncidents.filter(i => i.status === 'resolved');
    if (activeTab === 'false_positive') return recordedIncidents.filter(i => i.status === 'false_positive');
    return recordedIncidents;
  }, [incidents, activeTab]);

  // Count by status
  const counts = useMemo(() => {
    const recorded = incidents.filter(i => i.video_url || i.thumbnail_url);
    return {
      all: recorded.length,
      detected: recorded.filter(i => i.status === 'detected' || i.status === 'acknowledged' || i.status === 'responding').length,
      resolved: recorded.filter(i => i.status === 'resolved').length,
      false_positive: recorded.filter(i => i.status === 'false_positive').length,
    };
  }, [incidents]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; color: string }> = {
      detected: { variant: 'destructive', icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-400' },
      acknowledged: { variant: 'default', icon: <Clock className="w-3 h-3" />, color: 'text-orange-400' },
      responding: { variant: 'default', icon: <Clock className="w-3 h-3" />, color: 'text-yellow-400' },
      resolved: { variant: 'secondary', icon: <CheckCircle className="w-3 h-3" />, color: 'text-emerald-400' },
      false_positive: { variant: 'outline', icon: <Shield className="w-3 h-3" />, color: 'text-slate-400' },
    };
    const c = config[status] || config.detected;
    return (
      <Badge variant={c.variant} className={cn('gap-1', c.color)}>
        {c.icon}
        {t.status[status as keyof typeof t.status] || status}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-red-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>Error loading recordings</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-slate-950 p-3 sm:p-6', isRTL && 'rtl')}>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t.title}</h1>
            <p className="text-slate-500 text-xs sm:text-sm">{t.subtitle}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/live')} className="min-h-[44px] active:scale-95 transition-transform">
            <Play className="w-4 h-4 mr-2" />
            {t.goToLive}
          </Button>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800 w-full sm:w-auto overflow-x-auto flex-nowrap">
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-800 min-h-[40px] text-xs sm:text-sm whitespace-nowrap">
              {t.all} ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="detected" className="data-[state=active]:bg-slate-800 min-h-[40px] text-xs sm:text-sm whitespace-nowrap">
              {t.detected} ({counts.detected})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="data-[state=active]:bg-slate-800 min-h-[40px] text-xs sm:text-sm whitespace-nowrap">
              {t.resolved} ({counts.resolved})
            </TabsTrigger>
            <TabsTrigger value="false_positive" className="data-[state=active]:bg-slate-800 min-h-[40px] text-xs sm:text-sm whitespace-nowrap">
              {t.falsePositive} ({counts.false_positive})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredIncidents.length === 0 ? (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="py-12 text-center">
                  <Video className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-1">{t.noRecordings}</h3>
                  <p className="text-slate-500 text-sm mb-6">{t.noRecordingsDesc}</p>
                  <Button onClick={() => router.push('/live')}>
                    <Play className="w-4 h-4 mr-2" />
                    {t.goToLive}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredIncidents.map((incident) => (
                  <Card
                    key={incident.id}
                    className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer overflow-hidden active:scale-[0.98]"
                    onClick={() => setSelectedRecording(incident)}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-slate-800">
                      {incident.thumbnail_url ? (
                        <img
                          src={incident.thumbnail_url}
                          alt="Recording thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Video className="w-12 h-12" />
                        </div>
                      )}
                      {/* Play overlay - always visible on mobile, hover on desktop */}
                      {incident.video_url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-100 sm:opacity-0 sm:hover:opacity-100 sm:group-focus:opacity-100 transition-opacity">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-0.5 sm:ml-1" />
                          </div>
                        </div>
                      )}
                      {/* Status badge */}
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(incident.status)}
                      </div>
                      {/* Screenshot count indicator - shows grouped detections */}
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="bg-black/60 backdrop-blur gap-1">
                          <Images className="w-3 h-3" />
                          <span className="text-xs">Timeline</span>
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      {/* Info */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            {incident.cameras?.name || incident.cameras?.name_ar || 'Unknown Camera'}
                          </span>
                          <span className="text-orange-400 font-bold">
                            {Math.round(incident.confidence)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(incident.detected_at)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Video Modal - Mobile optimized */}
      {selectedRecording && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedRecording(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-t-xl sm:rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div>
                <h3 className="text-white font-medium">
                  {selectedRecording.cameras?.name || 'Recording'}
                </h3>
                <p className="text-sm text-slate-500">
                  {formatDate(selectedRecording.detected_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedRecording.status)}
                <Button variant="ghost" size="sm" onClick={() => setSelectedRecording(null)} className="min-h-[40px] min-w-[40px] active:scale-95">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Video/Screenshot Player */}
            <div className="aspect-video bg-black relative">
              {loadingMedia ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <div className="animate-pulse text-center">
                    <Images className="w-16 h-16 mx-auto mb-2" />
                    <p>Loading media...</p>
                  </div>
                </div>
              ) : selectedRecording.video_url ? (
                <video
                  src={selectedRecording.video_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={selectedRecording.thumbnail_url ?? undefined}
                />
              ) : incidentMedia && incidentMedia.screenshots.length > 0 ? (
                // Screenshot gallery viewer
                <>
                  <img
                    src={incidentMedia.screenshots[currentScreenshotIndex]}
                    alt={`Screenshot ${currentScreenshotIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  {/* Navigation arrows */}
                  {incidentMedia.screenshots.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentScreenshotIndex((i) => Math.max(0, i - 1))}
                        disabled={currentScreenshotIndex === 0}
                        className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 p-3 sm:p-2 min-w-[44px] min-h-[44px] rounded-full bg-black/50 hover:bg-black/70 active:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                      >
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                      <button
                        onClick={() => setCurrentScreenshotIndex((i) => Math.min(incidentMedia.screenshots.length - 1, i + 1))}
                        disabled={currentScreenshotIndex === incidentMedia.screenshots.length - 1}
                        className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-3 sm:p-2 min-w-[44px] min-h-[44px] rounded-full bg-black/50 hover:bg-black/70 active:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                      >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                      {/* Screenshot counter */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-xs sm:text-sm">
                        {currentScreenshotIndex + 1} / {incidentMedia.screenshots.length}
                      </div>
                    </>
                  )}
                </>
              ) : selectedRecording.thumbnail_url ? (
                <img
                  src={selectedRecording.thumbnail_url}
                  alt="Incident snapshot"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Video className="w-16 h-16 mx-auto mb-2" />
                    <p>{t.noVideo}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Screenshot Thumbnails Gallery */}
            {incidentMedia && incidentMedia.screenshots.length > 1 && (
              <div className="p-3 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <Images className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400">
                    {incidentMedia.screenshots.length} {t.screenshotCount}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {incidentMedia.screenshots.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentScreenshotIndex(idx)}
                      className={cn(
                        'flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all',
                        currentScreenshotIndex === idx
                          ? 'border-orange-500 ring-2 ring-orange-500/30'
                          : 'border-slate-700 hover:border-slate-500'
                      )}
                    >
                      <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">{t.confidence}</p>
                  <p className="text-white font-medium">{Math.round(selectedRecording.confidence)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.camera}</p>
                  <p className="text-white font-medium truncate">
                    {selectedRecording.cameras?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.location}</p>
                  <p className="text-white font-medium truncate">
                    {selectedRecording.locations?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Model</p>
                  <p className="text-white font-medium truncate">
                    {selectedRecording.model_used || 'Violence Detection'}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {selectedRecording.video_url && (
                  <a
                    href={selectedRecording.video_url}
                    download
                    className="inline-flex items-center gap-2 px-4 py-3 min-h-[48px] bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    {t.download}
                  </a>
                )}

                {/* Delete button */}
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-2 px-4 py-3 min-h-[48px] bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors active:scale-95 border border-red-900/50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.delete}
                  </button>
                ) : (
                  <div className="flex-1 min-w-full mt-2 p-3 bg-red-950/50 border border-red-900/50 rounded-lg">
                    <p className="text-red-400 font-medium mb-1">{t.deleteConfirm}</p>
                    <p className="text-red-400/70 text-sm mb-3">{t.deleteWarning}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors active:scale-95"
                      >
                        {deleting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t.deleting}
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            {t.delete}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors active:scale-95"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
