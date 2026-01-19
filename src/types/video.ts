/**
 * Video player related type definitions
 */

import type Hls from 'hls.js';
import type videojs from 'video.js';

/**
 * Video player configuration options
 */
export interface VideoPlayerConfig {
  /** Video element ID */
  elementId: string;
  /** Video source URL */
  src: string;
  /** Player width */
  width?: number;
  /** Player height */
  height?: number;
  /** Auto play flag */
  autoplay?: boolean;
  /** Muted flag */
  muted?: boolean;
  /** Controls visibility */
  controls?: boolean;
  /** HLS configuration */
  hlsConfig?: Partial<Hls.Config>;
}

/**
 * Video player events
 */
export interface VideoPlayerEvents {
  /** Player ready event */
  ready: () => void;
  /** Play event */
  play: () => void;
  /** Pause event */
  pause: () => void;
  /** Error event */
  error: (error: Error) => void;
  /** Quality change event */
  qualityChanged: (level: number) => void;
}

/**
 * Video player state
 */
export interface VideoPlayerState {
  /** Current playback time */
  currentTime: number;
  /** Video duration */
  duration: number;
  /** Playing state */
  playing: boolean;
  /** Muted state */
  muted: boolean;
  /** Volume level (0-1) */
  volume: number;
  /** Current quality level */
  qualityLevel: number;
  /** Available quality levels */
  qualityLevels: Array<{ level: number; height: number; bitrate: number }>;
}

/**
 * Video player interface
 */
export interface IVideoPlayer {
  /** Initialize the player */
  initialize(): Promise<void>;
  /** Play the video */
  play(): Promise<void>;
  /** Pause the video */
  pause(): void;
  /** Seek to specific time */
  seek(time: number): void;
  /** Set volume */
  setVolume(volume: number): void;
  /** Set mute state */
  setMuted(muted: boolean): void;
  /** Set quality level */
  setQualityLevel(level: number): void;
  /** Get current state */
  getState(): VideoPlayerState;
  /** Add event listener */
  on<K extends keyof VideoPlayerEvents>(event: K, handler: VideoPlayerEvents[K]): void;
  /** Remove event listener */
  off<K extends keyof VideoPlayerEvents>(event: K, handler: VideoPlayerEvents[K]): void;
  /** Destroy the player */
  destroy(): void;
}