import { API_BASE_URL } from '../config/api';
export async function homepageApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('vstigia_adm_token');
  const response = await fetch(API_BASE_URL + path, { ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
