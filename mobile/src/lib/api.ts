import { supabase } from './supabase';

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

type ApiOptions = RequestInit & { body?: string };

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL is not configured.');

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session has expired. Please sign in again.');

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'The server could not complete the request.');
  }

  return payload as T;
}
