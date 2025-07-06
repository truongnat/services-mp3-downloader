export const genericUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";

export interface Config {
  ytSessionServer?: string;
  ytSessionInnertubeClient: string;
  ytAllowBetterAudio: boolean;
  customInnertubeClient: string;
  cookiePath?: string;
}

export const env: Config = {
  // YouTube specific config
  ytSessionServer: process.env.YOUTUBE_SESSION_SERVER,
  ytSessionInnertubeClient: process.env.YOUTUBE_SESSION_INNERTUBE_CLIENT || 'WEB_EMBEDDED',
  ytAllowBetterAudio: process.env.YOUTUBE_ALLOW_BETTER_AUDIO !== "0",
  customInnertubeClient: process.env.CUSTOM_INNERTUBE_CLIENT || 'IOS',
  
  // Cookie config
  cookiePath: process.env.COOKIE_PATH,
};
