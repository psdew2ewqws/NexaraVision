import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getConfidenceLevel(probability: number): 'Low' | 'Medium' | 'High' {
  if (probability > 0.9) return 'High';
  if (probability > 0.7) return 'Medium';
  return 'Low';
}

export function getConfidenceColor(confidence: 'Low' | 'Medium' | 'High'): string {
  switch (confidence) {
    case 'High':
      return 'text-danger-red';
    case 'Medium':
      return 'text-warning-yellow';
    case 'Low':
      return 'text-success-green';
  }
}
