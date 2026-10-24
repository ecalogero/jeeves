import { auth } from './firebaseAuth';
import { WardrobeItem, UserPreferences } from '../types';

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${options.method ?? 'GET'} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Wardrobe ──────────────────────────────────────────────────────────────────

export async function getWardrobe(): Promise<WardrobeItem[]> {
  return apiFetch('/api/wardrobe');
}

export async function createWardrobeItem(item: WardrobeItem): Promise<WardrobeItem> {
  return apiFetch('/api/wardrobe', { method: 'POST', body: JSON.stringify(item) });
}

export async function updateWardrobeItem(item: WardrobeItem): Promise<WardrobeItem> {
  return apiFetch(`/api/wardrobe/${item.id}`, { method: 'PUT', body: JSON.stringify(item) });
}

export async function deleteWardrobeItem(id: string): Promise<void> {
  return apiFetch(`/api/wardrobe/${id}`, { method: 'DELETE' });
}

export async function bulkCreateWardrobeItems(items: WardrobeItem[]): Promise<WardrobeItem[]> {
  return apiFetch('/api/wardrobe/bulk', { method: 'POST', body: JSON.stringify({ items }) });
}

// ── Preferences ───────────────────────────────────────────────────────────────

export async function getPreferences(): Promise<UserPreferences> {
  return apiFetch('/api/preferences');
}

export async function upsertPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  return apiFetch('/api/preferences', { method: 'PUT', body: JSON.stringify(prefs) });
}

// ── Outfit History ────────────────────────────────────────────────────────────

export interface OutfitLogEntry {
  meetingTitle: string;
  meetingLocation: string;
  meetingFormality: string;
  wornAt?: string;
  itemIds: string[];
  feedback?: string;
}

export async function logOutfit(entry: OutfitLogEntry): Promise<void> {
  return apiFetch('/api/outfit-history', { method: 'POST', body: JSON.stringify(entry) });
}

// ── Shopper Cache ─────────────────────────────────────────────────────────────

export async function getShopperCache(
  gapsHash: string
): Promise<{ cached: boolean; recommendations?: any[] }> {
  return apiFetch(`/api/shopper-cache/cache?gapsHash=${gapsHash}`);
}

export async function saveShopperCache(gapsHash: string, recommendations: any[]): Promise<void> {
  return apiFetch('/api/shopper-cache/cache', {
    method: 'POST',
    body: JSON.stringify({ gapsHash, recommendations }),
  });
}
