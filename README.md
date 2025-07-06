# Music Playlist Downloader

A modern web application built with Next.js that allows users to download entire music playlists from SoundCloud as MP3 files.

## Features

- **SoundCloud Support**: Download playlists from SoundCloud
- **Batch Downloads**: Download entire playlists or individual tracks
- **Real-time Progress**: Track download progress for each song
- **Modern UI**: Clean, responsive interface built with Tailwind CSS and Radix UI
- **Client-side Processing**: Direct downloads without server storage
- **Rate Limiting Protection**: Built-in retry mechanisms and request throttling

## Supported Platforms

### SoundCloud
- Public playlists
- Up to 50 tracks per playlist
- Progressive audio format support
- Automatic metadata extraction

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI Components**: Radix UI primitives with Tailwind CSS
- **Audio Processing**: 
  - `soundcloud.ts` for SoundCloud
- **TypeScript**: Full type safety
- **Runtime**: Node.js with Turbopack for development

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd services-downloader-mp3
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables (if needed):
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### SoundCloud Playlists

1. Paste a SoundCloud playlist URL (e.g., `https://soundcloud.com/user/sets/playlist-name`)
2. Click "Lấy playlist" to fetch the playlist information
3. Choose to download individual tracks or the entire playlist

## API Endpoints

### SoundCloud APIs

#### `/api/soundcloud/playlist`
- **Method**: GET
- **Parameters**: `url` (playlist URL)
- **Description**: Fetches SoundCloud playlist information and track metadata

#### `/api/soundcloud/track`
- **Method**: GET
- **Parameters**: `url` (track URL)
- **Description**: Fetches SoundCloud track information and metadata

### YouTube APIs

#### `/api/youtube/track`
- **Method**: GET
- **Parameters**: `url` (audio URL)
- **Description**: Fetches YouTube audio information and download metadata

#### `/api/youtube/playlist`
- **Method**: GET
- **Parameters**: `url` (playlist URL)
- **Description**: Fetches YouTube playlist information (coming soon)

#### `/api/youtube/download`
- **Method**: GET
- **Parameters**: `url` (stream URL), `filename` (optional)
- **Description**: Proxy endpoint for downloading YouTube audio files

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── playlist/             # SoundCloud playlist API
│   ├── PlaylistDownloaderSoundCloud.tsx
│   └── page.tsx                  # Main application page
├── components/                   # Reusable UI components
│   └── ui/                       # Shadcn/ui components
├── lib/                          # Utility libraries
│   └── soundcloud.ts             # SoundCloud API integration
├── types/                        # TypeScript type definitions
└── public/                       # Static assets
```

## Features in Detail

### Download Management
- Individual track downloads with progress tracking
- Batch playlist downloads with sequential processing
- Error handling and retry mechanisms
- Prevention of accidental page closure during downloads

### User Experience
- Real-time progress indicators
- Responsive design for mobile and desktop
- Clean, intuitive interface

### Technical Features
- Client-side audio processing
- Automatic file naming and metadata
- Rate limiting protection for API calls

## Development

### Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env.local` file for local development:

```env
# Add any required environment variables here
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Legal Notice

This application is for educational and personal use only. Users are responsible for complying with the terms of service of SoundCloud, as well as applicable copyright laws. Only download content you have the right to download.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Common Issues

1. **Downloads not starting**: Check if the playlist URL is public and accessible
2. **Rate limiting**: Built-in retry mechanisms handle temporary API limits
3. **Large playlists**: SoundCloud downloads are limited to 50 tracks for performance

### Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Acknowledgments

- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [soundcloud.ts](https://github.com/Tenpi/soundcloud.ts) for SoundCloud API
