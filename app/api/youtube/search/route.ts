import { NextRequest, NextResponse } from "next/server";
import { CommonTrackInfo } from "@/lib/download-utils";

export const runtime = "nodejs";

async function searchYouTube(query: string, limit: number = 50): Promise<{ tracks: CommonTrackInfo[]; hasMore: boolean; total: number }> {
  // Temporarily disable YouTube search due to API parser issues
  // YouTube frequently updates their interface which breaks the parser
  console.warn('YouTube search temporarily disabled due to API changes');
  
  throw new Error('YouTube search is temporarily unavailable due to recent YouTube platform updates. Please paste direct YouTube URLs (video or playlist links) instead of searching. This will be fixed in a future update.');
  
  // TODO: Re-enable when YouTube.js fixes parser issues
  // The original search code is commented out below for future restoration
  
  /*
  try {
    // Initialize YouTube client with error handling
    const yt = await Innertube.create({
      // Use a more stable client for search
      initialCookie: undefined,
      fetch: undefined
    });
    
    // Search for videos with error handling
    let searchResults;
    try {
      searchResults = await yt.search(query, { type: 'video' });
    } catch (searchError) {
      console.warn('YouTube search failed with main method, trying alternative:', searchError);
      
      // Fallback: try without type specification
      try {
        searchResults = await yt.search(query);
      } catch (fallbackError) {
        console.error('All YouTube search methods failed:', fallbackError);
        throw new Error('YouTube search is currently unavailable due to API changes');
      }
    }
    
    // ... rest of the implementation
  } catch (error) {
    // ... error handling
  }
  */
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q");
  const limitParam = searchParams.get("limit");
  
  if (!query) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  try {
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const searchResults = await searchYouTube(query, limit);
    
    return NextResponse.json(searchResults);
  } catch (err) {
    console.error('YouTube search API error:', err);
    
    // Provide specific error messages based on the error type
    let message = "Search failed";
    let status = 500;
    
    if (err instanceof Error) {
      if (err.message.includes('YouTube search is temporarily unavailable')) {
        message = err.message;
        status = 503; // Service Temporarily Unavailable
      } else if (err.message.includes('API changes')) {
        message = "YouTube search is currently experiencing issues due to recent platform updates. Please try using direct YouTube URLs instead.";
        status = 503;
      } else {
        message = err.message;
      }
    }
    
    return NextResponse.json({ 
      error: message,
      suggestion: "Try pasting a direct YouTube URL instead of searching"
    }, { status });
  }
}