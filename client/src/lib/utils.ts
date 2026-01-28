import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Capacitor } from '@capacitor/core';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app.gruard.com';

/**
 * Converts relative URLs to absolute URLs for native platforms.
 * Native apps can't resolve relative URLs, so they need full URLs.
 */
export function getAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // For native platforms, prepend the API base URL
  if (Capacitor.isNativePlatform()) {
    // Ensure url starts with /
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL}${path}`;
  }
  
  // For web, relative URLs work fine
  return url;
}
