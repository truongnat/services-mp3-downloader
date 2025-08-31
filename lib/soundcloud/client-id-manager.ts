// SoundCloud Client ID management utilities

// In-memory cache for client ID
let cachedClientId: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Default fallback client ID (can be used if scraping fails)
const FALLBACK_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || "59BqQCyB9AWNYAglJEiHbp1h6keJHfrU";

export interface ClientIdResponse {
  clientId: string;
  cached: boolean;
  cacheAge: number;
  expiresIn: number;
}

// Function to get client ID from API endpoint (client-side only)
async function fetchClientIdFromAPI(): Promise<string | null> {
  // Only works in browser environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const response = await fetch('/api/soundcloud/get-client-id');
    
    if (!response.ok) {
      console.error('Failed to fetch client ID from API:', response.status);
      return null;
    }
    
    const data: ClientIdResponse = await response.json();
    return data.clientId;
  } catch (error) {
    console.error('Error fetching client ID from API:', error);
    return null;
  }
}

// Function to get client ID with caching and fallback
export async function getValidClientId(): Promise<string> {
  const now = Date.now();
  
  // Check if cached client ID is still valid
  if (cachedClientId && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedClientId;
  }
  
  // Only try to fetch from API in browser environment
  if (typeof window !== 'undefined') {
    try {
      // Try to get fresh client ID from API
      const freshClientId = await fetchClientIdFromAPI();
      
      if (freshClientId) {
        cachedClientId = freshClientId;
        cacheTimestamp = now;
        console.log('Using fresh scraped client ID:', freshClientId.substring(0, 8) + '...');
        return freshClientId;
      }
    } catch (error) {
      console.warn('Failed to get fresh client ID, using fallback:', error);
    }
  }
  
  // Fallback to environment variable or hardcoded client ID
  console.log('Using fallback client ID:', FALLBACK_CLIENT_ID.substring(0, 8) + '...');
  return FALLBACK_CLIENT_ID;
}

// Function to force refresh client ID (client-side only)
export async function refreshClientId(): Promise<string> {
  cachedClientId = null;
  cacheTimestamp = 0;
  
  // Only works in browser environment
  if (typeof window === 'undefined') {
    return FALLBACK_CLIENT_ID;
  }
  
  try {
    const response = await fetch('/api/soundcloud/get-client-id?refresh=true');
    
    if (response.ok) {
      const data: ClientIdResponse = await response.json();
      cachedClientId = data.clientId;
      cacheTimestamp = Date.now();
      console.log('Force refreshed client ID:', data.clientId.substring(0, 8) + '...');
      return data.clientId;
    }
  } catch (error) {
    console.error('Error force refreshing client ID:', error);
  }
  
  // Fallback if refresh fails
  return FALLBACK_CLIENT_ID;
}

// Function to test if a client ID is valid
export async function testClientId(clientId: string): Promise<boolean> {
  try {
    // Test the client ID by making a simple API call
    const testUrl = `https://api.soundcloud.com/resolve?url=https://soundcloud.com/discover&client_id=${clientId}`;
    const response = await fetch(testUrl);
    
    return response.ok;
  } catch (error) {
    console.error('Error testing client ID:', error);
    return false;
  }
}

// Function to get client ID info (for debugging)
export function getClientIdInfo(): { clientId: string | null; cached: boolean; cacheAge: number } {
  const now = Date.now();
  const cacheAge = cachedClientId ? now - cacheTimestamp : 0;
  const isCached = !!(cachedClientId && cacheAge < CACHE_DURATION);
  
  return {
    clientId: cachedClientId,
    cached: isCached,
    cacheAge: Math.floor(cacheAge / 1000)
  };
}