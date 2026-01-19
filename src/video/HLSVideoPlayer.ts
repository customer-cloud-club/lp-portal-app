/**
 * HLS Video Player implementation using HLS.js and Video.js
 */

import Hls from 'hls.js';
import videojs from 'video.js';
import type { VideoJsPlayer } from 'video.js';
import type {
  VideoPlayerConfig,
  VideoPlayerEvents,
  VideoPlayerState,
  IVideoPlayer
} from '../types/video';

/**
 * HLS Video Player class
 */
export class HLSVideoPlayer implements IVideoPlayer {
  private player: VideoJsPlayer | null = null;
  private hls: Hls | null = null;
  private config: VideoPlayerConfig;
  private eventHandlers: Partial<{
    [K in keyof VideoPlayerEvents]: VideoPlayerEvents[K][]
  }> = {};
  private videoElement: HTMLVideoElement | null = null;

  /**
   * Constructor
   * @param config - Video player configuration
   */
  constructor(config: VideoPlayerConfig) {
    this.config = {
      width: 640,
      height: 360,
      autoplay: false,
      muted: false,
      controls: true,
      ...config
    };
  }

  /**
   * Initialize the video player
   */
  public async initialize(): Promise<void> {
    try {
      this.videoElement = document.getElementById(this.config.elementId) as HTMLVideoElement;
      
      if (!this.videoElement) {
        throw new Error(`Video element with ID '${this.config.elementId}' not found`);
      }

      // Initialize Video.js player
      this.player = videojs(this.videoElement, {
        width: this.config.width,
        height: this.config.height,
        controls: this.config.controls,
        autoplay: this.config.autoplay,
        muted: this.config.muted,
        fluid: true,
        responsive: true
      });

      // Setup HLS if supported and source is HLS
      if (this.isHLSSource(this.config.src)) {
        await this.setupHLS();
      } else {
        this.player.src(this.config.src);
      }

      this.setupEventListeners();
      this.emit('ready');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to initialize video player');
      this.emit('error', errorObj);
      throw errorObj;
    }
  }

  /**
   * Play the video
   */
  public async play(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized');
    }

    try {
      await this.player.play();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to play video');
      this.emit('error', errorObj);
      throw errorObj;
    }
  }

  /**
   * Pause the video
   */
  public pause(): void {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    this.player.pause();
  }

  /**
   * Seek to specific time
   */
  public seek(time: number): void {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    this.player.currentTime(time);
  }

  /**
   * Set volume level
   */
  public setVolume(volume: number): void {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.player.volume(clampedVolume);
  }

  /**
   * Set muted state
   */
  public setMuted(muted: boolean): void {
    if (!this.player) {
      throw new Error('Player not initialized');
    }
    this.player.muted(muted);
  }

  /**
   * Set quality level
   */
  public setQualityLevel(level: number): void {
    if (!this.hls) {
      throw new Error('HLS not available');
    }
    this.hls.currentLevel = level;
    this.emit('qualityChanged', level);
  }

  /**
   * Get current player state
   */
  public getState(): VideoPlayerState {
    if (!this.player) {
      throw new Error('Player not initialized');
    }

    const qualityLevels = this.hls?.levels.map((level, index) => ({
      level: index,
      height: level.height,
      bitrate: level.bitrate
    })) || [];

    return {
      currentTime: this.player.currentTime() || 0,
      duration: this.player.duration() || 0,
      playing: !this.player.paused(),
      muted: this.player.muted(),
      volume: this.player.volume(),
      qualityLevel: this.hls?.currentLevel || -1,
      qualityLevels
    };
  }

  /**
   * Add event listener
   */
  public on<K extends keyof VideoPlayerEvents>(event: K, handler: VideoPlayerEvents[K]): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    (this.eventHandlers[event] as VideoPlayerEvents[K][]).push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof VideoPlayerEvents>(event: K, handler: VideoPlayerEvents[K]): void {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Destroy the player
   */
  public destroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (this.player) {
      this.player.dispose();
      this.player = null;
    }

    this.eventHandlers = {};
    this.videoElement = null;
  }

  /**
   * Check if source is HLS
   */
  private isHLSSource(src: string): boolean {
    return src.includes('.m3u8') || src.includes('application/x-mpegURL');
  }

  /**
   * Setup HLS.js
   */
  private async setupHLS(): Promise<void> {
    if (!Hls.isSupported()) {
      throw new Error('HLS is not supported in this browser');
    }

    if (!this.videoElement) {
      throw new Error('Video element not available');
    }

    this.hls = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
      ...this.config.hlsConfig
    });

    this.hls.loadSource(this.config.src);
    this.hls.attachMedia(this.videoElement);

    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (this.config.autoplay && this.player) {
        this.player.play().catch((error) => {
          this.emit('error', error instanceof Error ? error : new Error('Autoplay failed'));
        });
      }
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        this.emit('error', new Error(`HLS Error: ${data.type} - ${data.details}`));
      }
    });

    this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      this.emit('qualityChanged', data.level);
    });
  }

  /**
   * Setup Video.js event listeners
   */
  private setupEventListeners(): void {
    if (!this.player) return;

    this.player.on('play', () => {
      this.emit('play');
    });

    this.player.on('pause', () => {
      this.emit('pause');
    });

    this.player.on('error', () => {
      const error = this.player?.error();
      if (error) {
        this.emit('error', new Error(`Video.js Error: ${error.message || 'Unknown error'}`));
      }
    });
  }

  /**
   * Emit event to handlers
   */
  private emit<K extends keyof VideoPlayerEvents>(event: K, ...args: Parameters<VideoPlayerEvents[K]>): void {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as (...args: Parameters<VideoPlayerEvents[K]>) => void)(...args);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      });
    }
  }
}