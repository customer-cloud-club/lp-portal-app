/**
 * Video Player Factory for creating appropriate player instances
 */

import { HLSVideoPlayer } from './HLSVideoPlayer';
import type { VideoPlayerConfig, IVideoPlayer } from '../types/video';

/**
 * Supported video player types
 */
export enum VideoPlayerType {
  HLS = 'hls',
  STANDARD = 'standard'
}

/**
 * Video Player Factory class
 */
export class VideoPlayerFactory {
  /**
   * Create video player instance based on configuration
   * @param config - Video player configuration
   * @param type - Optional player type (auto-detected if not provided)
   * @returns Video player instance
   */
  public static createPlayer(
    config: VideoPlayerConfig,
    type?: VideoPlayerType
  ): IVideoPlayer {
    const playerType = type || this.detectPlayerType(config.src);

    switch (playerType) {
      case VideoPlayerType.HLS:
        return new HLSVideoPlayer(config);
      case VideoPlayerType.STANDARD:
        return new HLSVideoPlayer(config); // HLSVideoPlayer also handles standard videos
      default:
        throw new Error(`Unsupported video player type: ${playerType}`);
    }
  }

  /**
   * Auto-detect player type based on source URL
   * @param src - Video source URL
   * @returns Detected player type
   */
  private static detectPlayerType(src: string): VideoPlayerType {
    if (this.isHLSSource(src)) {
      return VideoPlayerType.HLS;
    }
    return VideoPlayerType.STANDARD;
  }

  /**
   * Check if source is HLS
   * @param src - Video source URL
   * @returns True if HLS source
   */
  private static isHLSSource(src: string): boolean {
    return src.includes('.m3u8') || src.includes('application/x-mpegURL');
  }

  /**
   * Check if HLS is supported in current environment
   * @returns True if HLS is supported
   */
  public static isHLSSupported(): boolean {
    try {
      const Hls = require('hls.js').default;
      return Hls.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * Get supported video formats
   * @returns Array of supported formats
   */
  public static getSupportedFormats(): string[] {
    const formats = ['mp4', 'webm', 'ogg'];
    
    if (this.isHLSSupported()) {
      formats.push('m3u8', 'hls');
    }
    
    return formats;
  }
}