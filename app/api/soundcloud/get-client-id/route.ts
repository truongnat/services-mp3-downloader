import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// In-memory cache for client ID
let cachedClientId: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Multiple patterns to extract client ID from SoundCloud page
const CLIENT_ID_PATTERNS = [
  /"client_id":"([a-zA-Z0-9]{32})"/g,
  /client_id=([a-zA-Z0-9]{32})/g,
  /client_id:"([a-zA-Z0-9]{32})"/g,
  /"client_id":\s*"([a-zA-Z0-9]{32})"/g,
  /clientId:\s*"([a-zA-Z0-9]{32})"/g,
  /clientId:"([a-zA-Z0-9]{32})"/g,
  /"clientId":"([a-zA-Z0-9]{32})"/g,
  /,clientId:"([a-zA-Z0-9]{32})"/g,
  /window\.__sc_hydration\s*=\s*\[{[^}]*"client_id":"([a-zA-Z0-9]{32})"/g,
];

// Function to scrape client ID from SoundCloud website
async function scrapeClientId(): Promise<string | null> {
  try {
    console.log('Scraping SoundCloud client ID...');
    
    // Try multiple URLs for better success rate
    const urls = [
      'https://soundcloud.com',
      'https://soundcloud.com/discover'
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${url}: ${response.status}`);
          continue;
        }

        const html = await response.text();
        const clientId = extractClientIdFromHtml(html);
        
        if (clientId) {
          console.log(`Found client ID from ${url}: ${clientId.substring(0, 8)}...`);
          return clientId;
        }
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        continue;
      }
    }

    console.error('No client ID found from any SoundCloud page');
    return null;
  } catch (error) {
    console.error('Error scraping client ID:', error);
    return null;
  }
}

// Function to extract client ID from HTML content
function extractClientIdFromHtml(html: string): string | null {
  // Try to find client ID using multiple patterns
  for (const pattern of CLIENT_ID_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    const matches = Array.from(html.matchAll(pattern));
    
    if (matches.length > 0) {
      // Get the most common client ID (in case there are multiple)
      const clientIds = matches.map(match => match[1]);
      const clientIdCounts = clientIds.reduce((acc: Record<string, number>, id) => {
        if (id && id.length === 32) { // Ensure it's 32 characters
          acc[id] = (acc[id] || 0) + 1;
        }
        return acc;
      }, {});
      
      const validClientIds = Object.entries(clientIdCounts)
        .filter(([id]) => /^[a-zA-Z0-9]{32}$/.test(id))
        .sort(([,a], [,b]) => b - a);
      
      if (validClientIds.length > 0) {
        return validClientIds[0][0];
      }
    }
  }

  // If patterns don't work, try to find any 32-character alphanumeric string that might be a client ID
  const genericPattern = /\b[a-zA-Z0-9]{32}\b/g;
  const genericMatches = Array.from(html.matchAll(genericPattern));
  
  if (genericMatches.length > 0) {
    // Filter potential client IDs by context (should appear near API-related terms)
    const contextKeywords = ['api', 'client', 'soundcloud', 'stream', 'track', 'user', 'hydration', 'oauth'];
    const potentialIds = genericMatches.map(match => match[0]);
    
    // Score each potential ID based on context
    const scoredIds = potentialIds.map(id => {
      const idIndex = html.indexOf(id);
      const context = html.substring(Math.max(0, idIndex - 200), idIndex + 200).toLowerCase();
      
      let score = 0;
      contextKeywords.forEach(keyword => {
        if (context.includes(keyword)) score++;
      });
      
      // Prefer IDs that appear in JSON-like structures
      if (context.includes('"') && context.includes(':')) score += 2;
      if (context.includes('client')) score += 3;
      if (context.includes('api')) score += 2;
      
      return { id, score, context: context.substring(Math.max(0, 180), Math.min(context.length, 220)) };
    });
    
    // Sort by score and return the highest scoring ID
    scoredIds.sort((a, b) => b.score - a.score);
    
    if (scoredIds.length > 0 && scoredIds[0].score > 2) {
      console.log(`Found potential client ID: ${scoredIds[0].id.substring(0, 8)}... (score: ${scoredIds[0].score})`);
      return scoredIds[0].id;
    }
  }

  return null;
}

// Function to get client ID (cached or fresh)
async function getClientId(): Promise<string | null> {
  const now = Date.now();
  
  // Check if cached client ID is still valid
  if (cachedClientId && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Using cached client ID');
    return cachedClientId;
  }
  
  // Scrape new client ID
  const newClientId = await scrapeClientId();
  
  if (newClientId) {
    cachedClientId = newClientId;
    cacheTimestamp = now;
    console.log('Client ID cached successfully');
  }
  
  return newClientId;
}

export async function GET(req: NextRequest) {
  try {
    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
    
    if (forceRefresh) {
      console.log('Force refreshing client ID cache...');
      cachedClientId = null;
      cacheTimestamp = 0;
    }
    
    const clientId = await getClientId();
    
    if (!clientId) {
      // Try to use environment variable as fallback
      const envClientId = process.env.SOUNDCLOUD_CLIENT_ID || "59BqQCyB9AWNYAglJEiHbp1h6keJHfrU";
      
      if (envClientId) {
        console.log('Using fallback client ID from environment');
        cachedClientId = envClientId;
        cacheTimestamp = Date.now();
        
        return NextResponse.json({
          clientId: envClientId,
          cached: false,
          cacheAge: 0,
          expiresIn: Math.floor(CACHE_DURATION / 1000),
          source: 'fallback'
        });
      }
      
      return NextResponse.json(
        { error: "Failed to obtain SoundCloud client ID" },
        { status: 500 }
      );
    }
    
    const cacheAge = Date.now() - cacheTimestamp;
    const isFromCache = cacheAge < CACHE_DURATION && !forceRefresh;
    
    return NextResponse.json({
      clientId,
      cached: isFromCache,
      cacheAge: Math.floor(cacheAge / 1000), // in seconds
      expiresIn: Math.floor((CACHE_DURATION - cacheAge) / 1000), // in seconds
      source: 'scraped'
    });
  } catch (error) {
    console.error('Error in get-client-id API:', error);
    
    // Emergency fallback
    const envClientId = process.env.SOUNDCLOUD_CLIENT_ID || "59BqQCyB9AWNYAglJEiHbp1h6keJHfrU";
    
    if (envClientId) {
      console.log('Using emergency fallback client ID');
      return NextResponse.json({
        clientId: envClientId,
        cached: false,
        cacheAge: 0,
        expiresIn: Math.floor(CACHE_DURATION / 1000),
        source: 'emergency_fallback',
        error: 'Scraping failed'
      });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}