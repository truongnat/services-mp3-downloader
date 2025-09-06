import { ImageResponse } from "next/og";

// Generate PNG favicons from the existing vector design
// Next.js will automatically link these icons in <head>
export const runtime = "edge";
export const contentType = "image/png";

// Generate multiple standard favicon sizes
export function generateImageMetadata() {
  const sizes = [16, 32, 48, 64, 128, 192, 256, 384, 512];
  return sizes.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType,
  }));
}

function SvgIcon({ size = 512 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect x="32" y="32" width="960" height="960" rx="192" fill="url(#g)" />
      <g>
        <circle cx="420" cy="700" r="110" fill="#ffffff" fillOpacity="0.95" />
        <rect x="560" y="300" width="48" height="360" rx="24" fill="#ffffff" fillOpacity="0.95" />
        <path
          d="M608 304c88 8 152 36 196 72 40 33 60 71 60 112 0 26-8 52-24 76-8 12-24 15-36 7-12-8-15-24-7-36 9-14 13-29 13-45 0-24-13-49-41-72-33-27-86-50-161-60v-54z"
          fill="#ffffff"
          fillOpacity="0.95"
        />
        <circle cx="384" cy="664" r="30" fill="#ffffff" fillOpacity="0.6" />
      </g>
    </svg>
  );
}

export default function Icon({ id }: { id?: string }) {
  const size = id ? Number(id) : 512;
  return new ImageResponse(<SvgIcon size={size} />, { width: size, height: size });
}
