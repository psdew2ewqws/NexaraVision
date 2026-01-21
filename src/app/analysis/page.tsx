'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { useIncidents, useCameras, useDashboardStats } from '@/hooks/useSupabase';
import { PageLoader } from '@/components/ui/page-loader';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Icons
const Icons = {
  chart: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  trending: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  loader: (
    <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  camera: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
};

const translations = {
  en: {
    title: 'Analysis & Reports',
    subtitle: 'Detailed analytics and incident reports',
    totalIncidents: 'Total Incidents',
    avgResponse: 'Avg Response Time',
    resolutionRate: 'Resolution Rate',
    activeCameras: 'Active Cameras',
    incidentTrends: 'Incident Trends',
    trendsDesc: 'Daily incident detection over last 7 days',
    recentIncidents: 'Recent Incidents',
    recentDesc: 'Latest detected incidents',
    incidentsByCamera: 'Incidents by Camera',
    cameraDesc: 'Distribution across cameras',
    statusDistribution: 'Status Distribution',
    statusDesc: 'Breakdown by incident status',
    cameraPerformance: 'Camera Performance',
    performanceDesc: 'Detection stats by camera',
    camera: 'Camera',
    incidents: 'Incidents',
    status: 'Status',
    online: 'Online',
    offline: 'Offline',
    noData: 'No data available',
    loading: 'Loading analytics...',
    resolved: 'Resolved',
    detected: 'Detected',
    acknowledged: 'Acknowledged',
    responding: 'Responding',
    false_positive: 'False Positive',
    view: 'View',
    confidence: 'Confidence',
  },
  ar: {
    title: 'التحليلات والتقارير',
    subtitle: 'تحليلات مفصلة وتقارير الحوادث',
    totalIncidents: 'إجمالي الحوادث',
    avgResponse: 'متوسط وقت الاستجابة',
    resolutionRate: 'معدل الحل',
    activeCameras: 'الكاميرات النشطة',
    incidentTrends: 'اتجاهات الحوادث',
    trendsDesc: 'كشف الحوادث اليومية خلال آخر 7 أيام',
    recentIncidents: 'الحوادث الأخيرة',
    recentDesc: 'آخر الحوادث المكتشفة',
    incidentsByCamera: 'الحوادث حسب الكاميرا',
    cameraDesc: 'التوزيع عبر الكاميرات',
    statusDistribution: 'توزيع الحالة',
    statusDesc: 'التقسيم حسب حالة الحادث',
    cameraPerformance: 'أداء الكاميرا',
    performanceDesc: 'إحصائيات الكشف حسب الكاميرا',
    camera: 'الكاميرا',
    incidents: 'الحوادث',
    status: 'الحالة',
    online: 'متصل',
    offline: 'غير متصل',
    noData: 'لا توجد بيانات',
    loading: 'جاري تحميل التحليلات...',
    resolved: 'تم الحل',
    detected: 'مكتشف',
    acknowledged: 'تم الإقرار',
    responding: 'جاري الاستجابة',
    false_positive: 'إنذار خاطئ',
    view: 'عرض',
    confidence: 'الثقة',
  },
};

const COLORS = ['#60a5fa', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

export default function AnalysisPage() {
  const { locale, isRTL } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  const { incidents, loading: incidentsLoading } = useIncidents(200);
  const { cameras, loading: camerasLoading } = useCameras();
  const { stats, loading: statsLoading } = useDashboardStats();

  const loading = incidentsLoading || camerasLoading || statsLoading;

  // Calculate trends data (last 7 days)
  const trendsData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days[key] = 0;
    }

    // Count incidents per day
    incidents.forEach((incident) => {
      const date = new Date(incident.detected_at);
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (days[key] !== undefined) {
        days[key]++;
      }
    });

    return Object.entries(days).map(([date, count]) => ({ date, incidents: count }));
  }, [incidents]);

  // Incidents by camera
  const cameraIncidents = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};

    incidents.forEach((incident) => {
      const cameraId = incident.camera_id || 'unknown';
      const cameraName = incident.cameras?.name || incident.cameras?.name_ar || 'Unknown';
      if (!counts[cameraId]) {
        counts[cameraId] = { name: cameraName, count: 0 };
      }
      counts[cameraId].count++;
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((item) => ({ camera: item.name, incidents: item.count }));
  }, [incidents]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      detected: 0,
      acknowledged: 0,
      responding: 0,
      resolved: 0,
      false_positive: 0,
    };

    incidents.forEach((incident) => {
      if (counts[incident.status] !== undefined) {
        counts[incident.status]++;
      }
    });

    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name: t[name as keyof typeof t] || name, value }));
  }, [incidents, t]);

  // Camera performance data
  const cameraPerformance = useMemo(() => {
    return cameras.map((camera) => {
      const cameraIncidentCount = incidents.filter((i) => i.camera_id === camera.id).length;
      return {
        name: camera.name || camera.name_ar || 'Unknown',
        incidents: cameraIncidentCount,
        status: camera.status,
      };
    }).sort((a, b) => b.incidents - a.incidents);
  }, [cameras, incidents]);

  // Resolution rate
  const resolutionRate = useMemo(() => {
    if (incidents.length === 0) return 0;
    const resolved = incidents.filter((i) => i.status === 'resolved' || i.status === 'false_positive').length;
    return Math.round((resolved / incidents.length) * 100);
  }, [incidents]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className={cn('min-h-screen bg-slate-950 p-3 sm:p-6', isRTL && 'rtl')}>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">{t.title}</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">{t.subtitle}</p>
        </div>

        {/* Stats Cards - Mobile optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-800/50 text-blue-400">{Icons.chart}</div>
              <div>
                <div className="text-xl sm:text-2xl font-semibold text-white">{incidents.length}</div>
                <div className="text-xs sm:text-sm text-slate-400">{t.totalIncidents}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-800/50 text-green-400">{Icons.trending}</div>
              <div>
                <div className="text-xl sm:text-2xl font-semibold text-white">
                  {stats.avgResponseTime > 0 ? `${stats.avgResponseTime}m` : '—'}
                </div>
                <div className="text-xs sm:text-sm text-slate-400">{t.avgResponse}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-800/50 text-purple-400">{Icons.document}</div>
              <div>
                <div className="text-xl sm:text-2xl font-semibold text-white">{resolutionRate}%</div>
                <div className="text-xs sm:text-sm text-slate-400">{t.resolutionRate}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-800/50 text-orange-400">{Icons.camera}</div>
              <div>
                <div className="text-xl sm:text-2xl font-semibold text-white">{stats.activeCameras}/{stats.totalCameras}</div>
                <div className="text-xs sm:text-sm text-slate-400">{t.activeCameras}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Incident Trends */}
          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-3 sm:p-5">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-medium text-white">{t.incidentTrends}</h2>
              <p className="text-xs sm:text-sm text-slate-400">{t.trendsDesc}</p>
            </div>
            <div className="h-48 sm:h-64">
              {trendsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#e2e8f0',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="incidents"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={{ fill: '#60a5fa', r: 4 }}
                      activeDot={{ r: 6, fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">{t.noData}</div>
              )}
            </div>
          </div>

          {/* Incidents by Camera */}
          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-3 sm:p-5">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-medium text-white">{t.incidentsByCamera}</h2>
              <p className="text-xs sm:text-sm text-slate-400">{t.cameraDesc}</p>
            </div>
            <div className="h-48 sm:h-64">
              {cameraIncidents.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cameraIncidents} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis dataKey="camera" type="category" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#e2e8f0',
                      }}
                    />
                    <Bar dataKey="incidents" fill="#60a5fa" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">{t.noData}</div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Status Distribution */}
          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-3 sm:p-5">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-medium text-white">{t.statusDistribution}</h2>
              <p className="text-xs sm:text-sm text-slate-400">{t.statusDesc}</p>
            </div>
            <div className="h-48 sm:h-64">
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#e2e8f0',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">{t.noData}</div>
              )}
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-3 sm:p-5">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-medium text-white">{t.recentIncidents}</h2>
              <p className="text-xs sm:text-sm text-slate-400">{t.recentDesc}</p>
            </div>
            <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
              {incidents.slice(0, 5).map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-3 bg-slate-800/30 border border-white/[0.04] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-slate-500">{Icons.calendar}</div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {incident.cameras?.name || incident.cameras?.name_ar || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(incident.detected_at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      'inline-block px-2 py-0.5 rounded text-xs font-medium',
                      incident.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                      incident.status === 'detected' ? 'bg-red-500/10 text-red-400' :
                      incident.status === 'acknowledged' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-slate-500/10 text-slate-400'
                    )}>
                      {t[incident.status as keyof typeof t] || incident.status}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">{Math.round(incident.confidence)}%</p>
                  </div>
                </div>
              ))}
              {incidents.length === 0 && (
                <div className="text-center py-8 text-slate-500">{t.noData}</div>
              )}
            </div>
          </div>
        </div>

        {/* Camera Performance Table */}
        <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="p-3 sm:p-5 border-b border-white/[0.06]">
            <h2 className="text-base sm:text-lg font-medium text-white">{t.cameraPerformance}</h2>
            <p className="text-xs sm:text-sm text-slate-400">{t.performanceDesc}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-5 text-slate-400 font-medium text-xs sm:text-sm">{t.camera}</th>
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-5 text-slate-400 font-medium text-xs sm:text-sm">{t.incidents}</th>
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-5 text-slate-400 font-medium text-xs sm:text-sm">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {cameraPerformance.map((camera, index) => (
                  <tr key={index} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 sm:py-3 px-3 sm:px-5 text-white text-sm">{camera.name}</td>
                    <td className="py-2 sm:py-3 px-3 sm:px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min((camera.incidents / Math.max(...cameraPerformance.map(c => c.incidents), 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-white text-sm">{camera.incidents}</span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-3 sm:px-5">
                      <span className={cn(
                        'px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium',
                        camera.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      )}>
                        {camera.status === 'online' ? t.online : t.offline}
                      </span>
                    </td>
                  </tr>
                ))}
                {cameraPerformance.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 sm:py-8 text-center text-slate-500 text-sm">{t.noData}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
