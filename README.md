# 🎵 Music Playlist Downloader

A modern, full-featured web application built with Next.js that allows users to download entire music playlists and individual tracks from multiple platforms with smart URL detection and advanced download management.

## ✨ Features

### 🎯 **Core Functionality**
- **Multi-Platform Support**: SoundCloud and YouTube with smart URL detection
- **Batch Downloads**: Download entire playlists or individual tracks
- **Real-time Progress**: Live download progress tracking with speed indicators
- **Smart URL Detection**: Automatically detects track vs playlist URLs
- **Fallback Logic**: Try playlist first, fallback to track for ambiguous URLs

### 🎨 **User Experience**
- **Modern UI**: Clean, responsive interface built with Tailwind CSS and Radix UI
- **Mobile Optimized**: Fully responsive design for all devices
- **Clear Button**: Easy-to-use clear functionality in search inputs
- **Settings Management**: Persistent audio quality and filename customization
- **Error Handling**: Graceful error recovery with clear feedback

### ⚙️ **Advanced Features**
- **Audio Quality Options**: Multiple quality settings (high, medium, low)
- **Format Selection**: MP3 format with configurable bitrates
- **Filename Customization**: Multiple filename format templates
- **Progress Tracking**: Individual track and overall playlist progress
- **macOS Integration**: Native download folder support

## 🌐 Supported Platforms

### 🎵 **SoundCloud**
- ✅ Public playlists (unlimited tracks with pagination)
- ✅ Individual tracks
- ✅ Short URLs (`on.soundcloud.com`, `snd.sc`)
- ✅ Standard URLs with `/sets/` for playlists
- ✅ Progressive audio format support
- ✅ Automatic metadata extraction

### 📺 **YouTube**
- ✅ Public playlists (unlimited videos)
- ✅ Individual videos
- ✅ Short URLs (`youtu.be`)
- ✅ Standard URLs with playlist parameters
- ✅ Multiple video formats support
- ✅ Channel and video metadata extraction

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: Next.js 15 with App Router and Turbopack
- **UI Components**: Radix UI primitives with Tailwind CSS
- **Icons**: Lucide React for consistent iconography
- **TypeScript**: Full type safety throughout the application
- **State Management**: React hooks with custom state management

### **Backend & APIs**
- **Audio Processing**:
  - `soundcloud.ts` for SoundCloud API integration
  - `@imput/youtubei.js` for YouTube API integration
- **Download Management**: Custom download utilities with progress tracking
- **URL Processing**: Smart URL validation and type detection
- **Error Handling**: Comprehensive error handling with retry mechanisms

### **Architecture**
- **Component-Based**: Modular, reusable components
- **Type Adapters**: Platform-agnostic data transformation
- **Generic Components**: Shared UI components across platforms
- **Custom Hooks**: Reusable state logic for playlist management

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** or **Bun** runtime
- **Package Manager**: npm, yarn, pnpm, or bun
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd services-mp3-downloader
```

2. **Install dependencies:**
```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install

# Or using bun
bun install
```

3. **Set up environment variables (optional):**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Run the development server:**
```bash
# Using pnpm (recommended)
pnpm dev

# Or using npm
npm run dev

# Or using yarn
yarn dev

# Or using bun
bun dev
```

5. **Open your browser:**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - If port 3000 is busy, Next.js will automatically use the next available port

### 🔧 Development Setup

For the best development experience:

```bash
# Install dependencies
pnpm install

# Start development server with Turbopack
pnpm dev

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Build for production
pnpm build
```

## 📖 Usage Guide

### 🎵 **SoundCloud Downloads**

#### **Playlists**
1. **Navigate to SoundCloud tab**
2. **Paste playlist URL** (e.g., `https://soundcloud.com/user/sets/playlist-name`)
3. **Click "Load"** to fetch playlist information
4. **Choose download option:**
   - **Individual tracks**: Click download button on specific tracks
   - **Entire playlist**: Click "Download All" button

#### **Individual Tracks**
1. **Paste track URL** (e.g., `https://soundcloud.com/user/track-name`)
2. **System automatically detects** it's a single track
3. **Click "Load"** to fetch track information
4. **Click download** to save the track

#### **Short URLs**
- ✅ `https://on.soundcloud.com/ABC123` (auto-detected)
- ✅ `https://snd.sc/ABC123` (auto-detected)
- System tries playlist first, then fallback to track

### 📺 **YouTube Downloads**

#### **Playlists**
1. **Navigate to YouTube tab**
2. **Paste playlist URL** (e.g., `https://youtube.com/playlist?list=PLxxx`)
3. **Click "Load"** to fetch playlist information
4. **Download individual videos or entire playlist**

#### **Individual Videos**
1. **Paste video URL** (e.g., `https://youtu.be/VIDEO_ID`)
2. **System automatically detects** it's a single video
3. **Click "Load"** to fetch video information
4. **Click download** to save as audio

### ⚙️ **Settings Configuration**

#### **Audio Quality**
- **High**: Best quality (320kbps when available)
- **Medium**: Balanced quality (192kbps)
- **Low**: Smaller files (128kbps)

#### **Filename Formats**
- `{index}. {artist} - {title}` (default)
- `{artist} - {title}`
- `{title} - {artist}`
- `{title}`

#### **Additional Options**
- **Include Artist**: Add artist name to filename
- **Include Index**: Add track number prefix
- **Sanitize Filename**: Remove invalid characters

## 🔌 API Endpoints

### 🎵 **SoundCloud APIs**

#### `GET /api/soundcloud/playlist`
- **Parameters**:
  - `url` (required): SoundCloud playlist URL
- **Response**: Playlist information with track metadata
- **Features**:
  - Supports unlimited tracks with pagination
  - Automatic fallback to single track if URL is not a playlist
  - Handles short URLs and standard URLs

#### `GET /api/soundcloud/track`
- **Parameters**:
  - `url` (required): SoundCloud track URL
- **Response**: Individual track information and metadata
- **Features**:
  - Supports all SoundCloud URL formats
  - Extracts stream URLs and metadata
  - Progressive audio format support

### 📺 **YouTube APIs**

#### `GET /api/youtube/playlist`
- **Parameters**:
  - `url` (required): YouTube playlist URL
- **Response**: Playlist information with video metadata
- **Features**:
  - Supports unlimited videos with pagination
  - Extracts video metadata and thumbnails
  - Handles private/unlisted playlists (if accessible)

#### `GET /api/youtube/video`
- **Parameters**:
  - `url` (required): YouTube video URL
- **Response**: Individual video information and metadata
- **Features**:
  - Supports all YouTube URL formats
  - Extracts video metadata and thumbnails
  - Multiple quality options

#### `GET /api/youtube/download`
- **Parameters**:
  - `url` (required): Stream URL
  - `filename` (optional): Custom filename
- **Response**: Audio file stream
- **Features**:
  - Proxy endpoint for secure downloads
  - Progress tracking support
  - Error handling and retry logic

### 📊 **Response Format**

#### **Playlist Response**
```json
{
  "playlistInfo": {
    "id": "playlist_id",
    "title": "Playlist Title",
    "description": "Playlist description",
    "artwork": "https://image-url.jpg",
    "tracksCount": 25
  },
  "tracks": [
    {
      "id": "track_id",
      "title": "Track Title",
      "artist": "Artist Name",
      "duration": 180,
      "artwork": "https://image-url.jpg",
      "url": "https://platform.com/track-url",
      "streamUrl": "https://stream-url.mp3"
    }
  ]
}
```

#### **Error Response**
```json
{
  "error": "Error message describing what went wrong"
}
```

## 📁 Project Structure

```
├── app/                                    # Next.js App Router
│   ├── api/                               # API routes
│   │   ├── soundcloud/                    # SoundCloud APIs
│   │   │   ├── playlist/route.ts          # Playlist endpoint
│   │   │   └── track/route.ts             # Track endpoint
│   │   └── youtube/                       # YouTube APIs
│   │       ├── playlist/route.ts          # Playlist endpoint
│   │       ├── video/route.ts             # Video endpoint
│   │       └── download/route.ts          # Download proxy
│   ├── PlaylistDownloaderSoundCloud.tsx   # SoundCloud component
│   ├── PlaylistDownloaderYouTube.tsx      # YouTube component
│   └── page.tsx                           # Main application page
├── components/                            # Reusable UI components
│   ├── playlist/                          # Playlist-specific components
│   │   ├── playlist-downloader.tsx        # Generic downloader
│   │   ├── playlist-input.tsx             # URL input with clear button
│   │   ├── playlist-header.tsx            # Playlist info display
│   │   ├── track-list.tsx                 # Track listing with progress
│   │   └── macos-tip.tsx                  # macOS download tip
│   ├── settings-dialog.tsx                # Settings configuration
│   ├── icons.tsx                          # Custom icon components
│   └── ui/                                # Shadcn/ui base components
├── lib/                                   # Utility libraries
│   ├── soundcloud/                        # SoundCloud integration
│   │   └── soundcloud.ts                  # API client and utilities
│   ├── youtube/                           # YouTube integration
│   │   ├── youtube.ts                     # API client and utilities
│   │   ├── config.ts                      # Configuration
│   │   └── cookie-manager.ts              # Session management
│   ├── hooks/                             # Custom React hooks
│   │   └── use-playlist-downloader.ts     # Playlist state management
│   ├── download-utils.ts                  # Download utilities
│   ├── platform-downloads.ts             # Platform-specific downloads
│   ├── type-adapters.ts                   # Data transformation
│   ├── url-validator.ts                   # URL validation and detection
│   └── settings.ts                        # Settings management
├── types/                                 # TypeScript type definitions
│   ├── soundcloud.ts                      # SoundCloud types
│   ├── youtube.ts                         # YouTube types
│   └── common.ts                          # Shared types
└── public/                                # Static assets
    └── favicon.ico                        # Application icon
```

## 🔥 Features in Detail

### 📥 **Download Management**
- **Individual Track Downloads**: Progress tracking with real-time speed indicators
- **Batch Playlist Downloads**: Sequential processing to avoid overwhelming servers
- **Smart Error Handling**: Automatic retry mechanisms with exponential backoff
- **Download Prevention**: Prevents accidental page closure during active downloads
- **Progress Persistence**: Download state maintained across page refreshes
- **Concurrent Control**: Configurable number of simultaneous downloads

### 🎨 **User Experience**
- **Real-time Progress**: Live progress bars with percentage and speed indicators
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Clean Interface**: Intuitive, modern design with clear visual hierarchy
- **Clear Button**: Easy-to-use clear functionality in search inputs
- **Loading States**: Comprehensive loading indicators and feedback
- **Error Recovery**: Graceful error handling with clear user feedback

### 🔧 **Technical Features**
- **Client-side Processing**: Direct downloads without server storage
- **Smart URL Detection**: Automatic platform and content type detection
- **Fallback Logic**: Try playlist first, fallback to track for ambiguous URLs
- **Type Safety**: Full TypeScript implementation with strict typing
- **Generic Components**: Reusable components across platforms
- **Custom Hooks**: Centralized state management with React hooks

### 🛡️ **Security & Performance**
- **Rate Limiting Protection**: Built-in throttling for API calls
- **CORS Handling**: Proper cross-origin request management
- **Memory Optimization**: Efficient handling of large playlists
- **Error Boundaries**: Comprehensive error catching and recovery
- **Session Management**: Secure token handling for YouTube integration

## 🛠️ Development

### 📜 **Available Scripts**

```bash
# Development
pnpm dev              # Start development server with Turbopack
pnpm dev:debug        # Start with debug mode enabled

# Building
pnpm build            # Build for production
pnpm start            # Start production server
pnpm preview          # Preview production build locally

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues automatically
pnpm type-check       # Run TypeScript type checking
pnpm format           # Format code with Prettier

# Testing
pnpm test             # Run tests (when implemented)
pnpm test:watch       # Run tests in watch mode
```

### 🔧 **Environment Variables**

Create a `.env.local` file for local development:

```env
# YouTube API Configuration (optional)
YOUTUBE_COOKIE="your_youtube_cookie_here"

# Development Settings
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Custom API endpoints
NEXT_PUBLIC_SOUNDCLOUD_API_URL=
NEXT_PUBLIC_YOUTUBE_API_URL=
```

### 🏗️ **Development Workflow**

1. **Setup Development Environment**
   ```bash
   pnpm install
   cp .env.example .env.local
   pnpm dev
   ```

2. **Code Style Guidelines**
   - Use TypeScript for all new code
   - Follow ESLint and Prettier configurations
   - Use functional components with hooks
   - Implement proper error boundaries

3. **Component Development**
   - Create reusable components in `/components`
   - Use generic components for cross-platform functionality
   - Implement proper TypeScript interfaces
   - Add proper error handling

4. **API Development**
   - Follow RESTful conventions
   - Implement proper error responses
   - Add request validation
   - Use TypeScript for request/response types

## 🤝 Contributing

We welcome contributions! Please follow these steps:

### 🔄 **Contribution Workflow**

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/services-mp3-downloader.git
   cd services-mp3-downloader
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the code style guidelines
   - Add tests if applicable
   - Update documentation as needed

4. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```

5. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Provide a clear description of changes
   - Include screenshots for UI changes
   - Reference any related issues

### 📋 **Contribution Guidelines**

- **Code Style**: Follow ESLint and Prettier configurations
- **Commit Messages**: Use conventional commit format
- **Testing**: Add tests for new features
- **Documentation**: Update README and code comments
- **Performance**: Consider performance implications
- **Accessibility**: Ensure accessibility compliance

## ⚖️ Legal Notice

**Important**: This application is for educational and personal use only.

### 📜 **Terms of Use**
- Users are responsible for complying with platform terms of service
- Only download content you have the legal right to download
- Respect copyright laws and intellectual property rights
- Use responsibly and ethically

### 🛡️ **Disclaimer**
- This tool is provided "as is" without warranties
- Users assume all responsibility for their usage
- Developers are not liable for misuse of this application

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### 🔓 **MIT License Summary**
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ❗ License and copyright notice required
- ❗ No warranty provided

## 🔧 Troubleshooting

### 🚨 **Common Issues**

#### **Downloads Not Starting**
- ✅ **Check URL**: Ensure the playlist/track URL is public and accessible
- ✅ **Browser Permissions**: Allow downloads in browser settings
- ✅ **Network**: Check internet connection stability
- ✅ **CORS**: Some URLs may be blocked by CORS policies

#### **Rate Limiting**
- ✅ **Built-in Retry**: Automatic retry mechanisms handle temporary limits
- ✅ **Sequential Downloads**: Downloads are processed sequentially to avoid limits
- ✅ **Wait Period**: If rate limited, wait a few minutes before retrying

#### **Large Playlists**
- ✅ **Pagination**: System handles unlimited tracks with automatic pagination
- ✅ **Memory**: Large playlists are processed in batches
- ✅ **Performance**: Sequential processing prevents browser overload

#### **YouTube Issues**
- ✅ **Session Tokens**: YouTube integration uses session management
- ✅ **Video Availability**: Some videos may be region-restricted
- ✅ **Format Support**: System automatically selects best available format

#### **SoundCloud Issues**
- ✅ **Track Availability**: Some tracks may be private or removed
- ✅ **Stream URLs**: System handles progressive and HLS formats
- ✅ **Short URLs**: Automatic detection and resolution

### 🌐 **Browser Compatibility**

#### **Fully Supported**
- ✅ **Chrome/Chromium 90+** (Recommended)
- ✅ **Firefox 88+**
- ✅ **Safari 14+**
- ✅ **Edge 90+**

#### **Required Features**
- ✅ **File System Access API** (for direct downloads)
- ✅ **Fetch API** (for network requests)
- ✅ **ES2020 Support** (for modern JavaScript)
- ✅ **WebAssembly** (for audio processing)

### 📱 **Mobile Support**
- ✅ **iOS Safari 14+**
- ✅ **Android Chrome 90+**
- ✅ **Samsung Internet 14+**
- ⚠️ **Limited file system access on mobile**

## 🙏 Acknowledgments

### 🛠️ **Core Technologies**
- [**Next.js**](https://nextjs.org/) - React framework with App Router
- [**Tailwind CSS**](https://tailwindcss.com/) - Utility-first CSS framework
- [**Radix UI**](https://www.radix-ui.com/) - Accessible component primitives
- [**TypeScript**](https://www.typescriptlang.org/) - Type-safe JavaScript

### 🎵 **Audio Processing**
- [**soundcloud.ts**](https://github.com/Tenpi/soundcloud.ts) - SoundCloud API integration
- [**@imput/youtubei.js**](https://github.com/imputnet/youtubei.js) - YouTube API integration
- [**Lucide React**](https://lucide.dev/) - Beautiful icon library

### 🎨 **UI Components**
- [**Shadcn/ui**](https://ui.shadcn.com/) - Re-usable component library
- [**Radix Colors**](https://www.radix-ui.com/colors) - Color system
- [**Tailwind CSS**](https://tailwindcss.com/) - Styling framework

### 🚀 **Development Tools**
- [**Turbopack**](https://turbo.build/pack) - Fast bundler for development
- [**ESLint**](https://eslint.org/) - Code linting and quality
- [**Prettier**](https://prettier.io/) - Code formatting
- [**pnpm**](https://pnpm.io/) - Fast, disk space efficient package manager

---

<div align="center">

**Made with ❤️ for music lovers everywhere**

[⭐ Star this repo](https://github.com/your-username/services-mp3-downloader) • [🐛 Report Bug](https://github.com/your-username/services-mp3-downloader/issues) • [💡 Request Feature](https://github.com/your-username/services-mp3-downloader/issues)

</div>
