import type { DurationPreset } from '../core/types';

export function computeExpiry(createdAt: number, preset: DurationPreset): number;
export function timeAgo(timestamp: number | null | undefined): string;
export function daysLeft(expiresAt: number | null | undefined): string;
export function formatDate(timestamp: number): string;
