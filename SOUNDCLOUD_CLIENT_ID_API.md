# SoundCloud Client ID Scraper API

## Overview

This API endpoint scrapes SoundCloud's client ID directly from their website and caches it for use with SoundCloud API requests. This ensures that the application always has a valid, up-to-date client ID without manual configuration.

## API Endpoint

### GET `/api/soundcloud/get-client-id`

**Description**: Retrieves a valid SoundCloud client ID by scraping it from SoundCloud's website.

**Query Parameters**:
- `refresh` (optional): Set to `"true"` to force refresh the cached client ID

**Response Format**:
```json
{
  "clientId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "cached": false,
  "cacheAge": 0,
  "expiresIn": 3600
}
```

**Response Fields**:
- `clientId`: The scraped SoundCloud client ID (32-character alphanumeric string)
- `cached`: Boolean indicating if the response is from cache
- `cacheAge`: Age of cached data in seconds
- `expiresIn`: Time until cache expires in seconds

## Implementation Details

### Scraping Strategy

The API uses multiple regex patterns to find client IDs from SoundCloud's main page:

1. `"client_id":"([a-zA-Z0-9]{32})"` - Standard JSON format
2. `client_id=([a-zA-Z0-9]{32})` - URL parameter format
3. `client_id:"([a-zA-Z0-9]{32})"` - Alternative JSON format
4. `"client_id":\s*"([a-zA-Z0-9]{32})"` - JSON with spaces
5. `clientId:\s*"([a-zA-Z0-9]{32})"` - camelCase format
6. `clientId:"([a-zA-Z0-9]{32})"` - camelCase alternative

### Caching

- **Cache Duration**: 1 hour (3600 seconds)
- **Storage**: In-memory cache (resets on server restart)
- **Strategy**: Most frequently occurring client ID is selected when multiple IDs are found

### Fallback Mechanism

If scraping fails, the system falls back to:
1. Environment variable `SOUNDCLOUD_CLIENT_ID`
2. Hardcoded fallback client ID

### Usage in SoundCloud Library

The enhanced SoundCloud library automatically uses the scraped client ID:

```typescript
import { getValidClientId } from './client-id-manager';

// Automatically gets fresh or cached client ID
const clientId = await getValidClientId();
const streamUrl = `${progressive.url}?client_id=${clientId}`;
```

## Error Handling

**500 Internal Server Error**:
```json
{
  "error": "Failed to obtain SoundCloud client ID"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error"
}
```

## Examples

### Basic Usage
```bash
curl "http://localhost:3000/api/soundcloud/get-client-id"
```

### Force Refresh
```bash
curl "http://localhost:3000/api/soundcloud/get-client-id?refresh=true"
```

### Client-side Usage
```javascript
async function getClientId() {
  const response = await fetch('/api/soundcloud/get-client-id');
  const data = await response.json();
  return data.clientId;
}
```

## Integration Benefits

1. **Automatic Updates**: No manual client ID management required
2. **High Availability**: Automatic fallback to environment variables
3. **Performance**: 1-hour caching reduces scraping overhead
4. **Reliability**: Multiple detection patterns increase success rate
5. **Transparency**: Cache status and expiration information provided

## Development Notes

- The scraper mimics a real browser with proper User-Agent headers
- Rate limiting is handled through caching mechanism
- Server-side only functionality (client-side has appropriate checks)
- Compatible with existing SoundCloud integration without breaking changes

## Security Considerations

- No sensitive data is cached or exposed
- Client IDs are public information available in SoundCloud's frontend
- Scraping follows standard web scraping practices
- No authentication or private data is accessed