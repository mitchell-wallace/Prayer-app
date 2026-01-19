import type { DurationPreset } from '../types';

interface DurationOffset {
  days?: number;
  months?: number;
  years?: number;
}

const durationOffsets: Record<DurationPreset, DurationOffset> = {
  '10d': { days: 10 },
  '1m': { months: 1 },
  '3m': { months: 3 },
  '6m': { months: 6 },
  '1y': { years: 1 },
};

export function computeExpiry(createdAt: number, preset: DurationPreset): number {
  const base = new Date(createdAt);
  const offset = durationOffsets[preset] || durationOffsets['6m'];
  const next = new Date(base.getTime());
  if (offset.days) {
    next.setDate(next.getDate() + offset.days);
  }
  if (offset.months) {
    next.setMonth(next.getMonth() + offset.months);
  }
  if (offset.years) {
    next.setFullYear(next.getFullYear() + offset.years);
  }
  return next.getTime();
}

export function timeAgo(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function daysLeft(expiresAt: number | null | undefined): string {
  if (!expiresAt) return '';
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days > 30) {
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month left' : `${months} months left`;
  }
  if (days > 1) return `${days} days left`;
  if (days === 1) return '1 day left';
  if (days === 0) return 'Expires today';
  return 'Expired';
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatNoteTimestamp(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) {
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  }
  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${dateStr} at ${timeStr}`;
}
