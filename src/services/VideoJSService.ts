import videojs from 'video.js';
import 'videojs-contrib-hls';
import { HLSConfig, VideoQualityLevel } from '../types/hls';

/**
 * Service for integrating Video.js with HLS
 */
export class VideoJSService {
  private player: videojs.Player | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  /**
   * Initialize Video.js player with HLS support
   * @param elementId - Video element ID or HTMLVideoElement
   * @param options - Video.js options
   */
  public initialize(
    elementId: string | HTMLVideoElement,
    options: videojs.PlayerOptions & { hls?: HLSConfig } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const playerOptions: videojs.PlayerOptions = {
          controls: true,
          fluid: true,
          responsive: true,
          html5: {
            hls: {
              overrideNative: true,
              ...options.hls
            }
          },
          ...options
        };

        this.player = videojs(elementId, playerOptions, () => {
          this.setupEventListeners();
          resolve();
        });

        if (this.player.el()) {
          this.videoElement = this.player.el().querySelector('video');
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Load HLS source
   * @param src - HLS source URL or source object
   */
  public loadSource(src: string | { src: string; type: string }): void {
    if (!this.player) {
      throw new Error('Video.js player not initialized');
    }

    const source = typeof src === 'string' 
      ? { src, type: 'application/x-mpegURL' }
      : src;

    this.player.src(source);
  }

  /**
   * Get available quality levels
   * @returns Array of quality levels
   */
  public getQualityLevels(): VideoQualityLevel[] {
    if (!this.player) {
      return [];
    }

    const qualityLevels = this.player.qualityLevels();
    const levels: VideoQualityLevel[] = [];

    for (let i = 0; i < qualityLevels.length; i++) {
      const level = qualityLevels[i];
      levels.push({
        height: level.height,
        width: level.width,
        bitrate: level.bandwidth,
        name: `${level.height}p`,
        index: i
      });
    }

    return levels;
  }

  /**
   * Set quality level
   * @param levelIndex - Quality level index
   */
  public setQualityLevel(levelIndex: number): void {
    if (!this.player) {
      throw new Error('Video.js player not initialized');
    }

    const qualityLevels = this.player.qualityLevels();
    
    // Disable all levels first
    for (let i = 0; i < qualityLevels.length; i++) {
      qualityLevels[i].enabled = false;
    }

    // Enable selected level or auto if -1
    if (levelIndex >= 0 && levelIndex < qualityLevels.length) {
      qualityLevels[levelIndex].enabled = true;
    } else {
      // Enable all for auto selection
      for (let i = 0; i < qualityLevels.length; i++) {
        qualityLevels[i].enabled = true;
      }
    }
  }

  /**
   * Get current time
   * @returns Current playback time in seconds
   */
  public getCurrentTime(): number {
    return this.player?.currentTime() ?? 0;
  }

  /**
   * Set current time
   * @param time - Time in seconds
   */
  public setCurrentTime(time: number): void {
    this.player?.currentTime(time);
  }

  /**
   * Get duration
   * @returns Video duration in seconds
   */
  public getDuration(): number {
    return this.player?.duration() ?? 0;
  }

  /**
   * Play video
   */
  public play(): Promise<void> {
    return this.player?.play() ?? Promise.resolve();
  }

  /**
   * Pause video
   */
  public pause(): void {
    this.player?.pause();
  }

  /**
   * Check if video is paused
   * @returns True if paused
   */
  public isPaused(): boolean {
    return this.player?.paused() ?? true;
  }

  /**
   * Set volume
   * @param volume - Volume level (0-1)
   */
  public setVolume(volume: number): void {
    this.player?.volume(Math.max(0, Math.min(1, volume)));
  }

  /**
   * Get volume
   * @returns Current volume level (0-1)
   */
  public getVolume(): number {
    return this.player?.volume() ?? 0;
  }

  /**
   * Add event listener
   * @param event - Event name
   * @param callback - Event callback
   */
  public addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);

    this.player?.on(event, callback);
  }

  /**
   * Remove event listener
   * @param event - Event name
   * @param callback - Event callback
   */
  public removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    this.player?.off(event, callback);
  }

  /**
   * Setup default event listeners
   */
  private setupEventListeners(): void {
    if (!this.player) return;

    this.player.on('error', (error: any) => {
      console.error('Video.js Error:', error);
    });

    this.player.on('loadstart', () => {
      console.log('Video.js: Load started');
    });
  }

  /**
   * Dispose player and cleanup
   */
  public dispose(): void {
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
    this.videoElement = null;
    this.eventListeners.clear();
  }

  /**
   * Get Video.js player instance
   * @returns Video.js player instance
   */
  public getPlayer(): videojs.Player | null {
    return this.player;
  }
}
