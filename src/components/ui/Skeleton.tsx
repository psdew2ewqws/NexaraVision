'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'text' | 'card';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton loading placeholder component
 * Provides visual feedback while content is loading
 */
export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseStyles = 'bg-slate-700/50';

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50 bg-[length:200%_100%]',
    none: '',
  };

  const variantStyles = {
    default: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
    card: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseStyles,
        animationStyles[animation],
        variantStyles[variant],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Text skeleton with multiple lines
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full' // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton for dashboard/list items
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 bg-slate-800/50 rounded-xl space-y-3', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <Skeleton variant="default" className="h-20 w-full" />
      <div className="flex gap-2">
        <Skeleton variant="default" className="h-8 w-20" />
        <Skeleton variant="default" className="h-8 w-20" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <tr className={cn('border-b border-slate-700/50', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton variant="text" className="w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Stats card skeleton for dashboard
 */
export function SkeletonStats({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 bg-slate-800/50 rounded-xl', className)}>
      <div className="flex items-center justify-between mb-2">
        <Skeleton variant="text" className="w-24 h-3" />
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <Skeleton variant="text" className="w-16 h-8 mb-1" />
      <Skeleton variant="text" className="w-20 h-3" />
    </div>
  );
}
