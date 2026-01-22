'use client';

/**
 * Analytics Charts Component
 * Separated for dynamic import to reduce initial bundle size
 * recharts is ~500KB and only needed on the analysis page
 */

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

// Status colors for pie chart
const COLORS = ['#22c55e', '#ef4444', '#f97316', '#eab308', '#64748b'];

// Shared tooltip styles
const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
};

interface TrendData {
  date: string;
  incidents: number;
  [key: string]: string | number;
}

interface CameraData {
  camera: string;
  incidents: number;
  [key: string]: string | number;
}

interface StatusData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface IncidentTrendsChartProps {
  data: TrendData[];
  noDataText: string;
}

export function IncidentTrendsChart({ data, noDataText }: IncidentTrendsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        {noDataText}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} />
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
  );
}

interface CameraIncidentsChartProps {
  data: CameraData[];
  noDataText: string;
}

export function CameraIncidentsChart({ data, noDataText }: CameraIncidentsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        {noDataText}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis
          dataKey="camera"
          type="category"
          stroke="#64748b"
          tick={{ fill: '#64748b', fontSize: 11 }}
          width={100}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="incidents" fill="#60a5fa" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface StatusDistributionChartProps {
  data: StatusData[];
  noDataText: string;
}

export function StatusDistributionChart({ data, noDataText }: StatusDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        {noDataText}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Loading skeleton for charts
export function ChartSkeleton() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
    </div>
  );
}
