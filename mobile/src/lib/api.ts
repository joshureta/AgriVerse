import { supabase } from './supabase';

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

type ApiOptions = RequestInit & { body?: string };

async function request<T>(path: string, options: ApiOptions, token?: string): Promise<T> {
  if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL is not configured.');

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'The server could not complete the request.');
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  return request<T>(path, options, token);
}

export function publicApiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  return request<T>(path, options);
}
