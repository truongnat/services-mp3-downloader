import { readFileSync, existsSync } from 'fs';
import { env } from './config';

export function getCookie(name: string): string | undefined {
  if (!env.cookiePath || !existsSync(env.cookiePath)) {
    return undefined;
  }

  try {
    const cookieContent = readFileSync(env.cookiePath, 'utf-8');
    // Simple cookie parsing - in production you might want more robust parsing
    const cookies = cookieContent.split(';').map(c => c.trim());
    const targetCookie = cookies.find(c => c.startsWith(`${name}=`));
    return targetCookie ? targetCookie.split('=')[1] : undefined;
  } catch {
    return undefined;
  }
}
