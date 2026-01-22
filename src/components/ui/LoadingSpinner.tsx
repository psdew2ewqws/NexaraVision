'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

/**
 * Loading spinner component
 * Uses Lucide Loader2 icon with spin animation
 */
export function LoadingSpinner({
  size = 'md',
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2
        className={cn('animate-spin text-blue-500', sizeClasses[size])}
        aria-hidden="true"
      />
      {label && (
        <span className="text-sm text-neutral-400">{label}</span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
}

/**
 * Full page loading overlay
 */
export function PageLoading({
  message = 'Loading...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" />
        <p className="text-lg text-white font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading state for content areas
 */
export function InlineLoading({
  message = 'Loading...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 p-8',
        className
      )}
    >
      <LoadingSpinner size="md" />
      <span className="text-neutral-400">{message}</span>
    </div>
  );
}

/**
 * Button loading state
 * Replaces button content with spinner while loading
 */
export function ButtonLoading({ className }: { className?: string }) {
  return <LoadingSpinner size="sm" className={className} />;
}
