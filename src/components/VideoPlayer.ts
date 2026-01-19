import { HLSService } from '../services/HLSService';
import { VideoJSService } from '../services/VideoJSService';
import { HLSConfig, VideoQualityLevel } from '../types/hls';

export type PlayerType = 'hls' | 'videojs';

export interface VideoPlayerConfig {
  playerType: PlayerType;
  hlsConfig?: HLSConfig;
  videojsOptions?: any;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
}

/**
 * Universal video player component supporting both HLS.js and Video.js
 */
export class VideoPlayer {
  private hlsService: HLSService | null = null;
  private videojsService: VideoJSService | null = null;
  private playerType: PlayerType;
  private videoElement: HTMLVideoElement;
  private config: VideoPlayerConfig;
  private isInitialized = false;

  /**
   * Create video player instance
   * @param container - Container element or selector
   * @param config - Player configuration
   */
  constructor(
    container: HTMLElement | string,
    config: VideoPlayerConfig
  ) {
    this.config = config;
    this.playerType = config.playerType;

    // Create or get video element
    const containerElement = typeof container === 'string'
      ? document.querySelector(container) as HTMLElement
      : container;

    if (!containerElement) {
      throw new Error('Container element not found');
    }

    this.videoElement = this.createVideoElement(containerElement);
  }

  /**
   * Initialize the player
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (this.playerType === 'hls') {
        await this.initializeHLS();
      } else if (this.playerType === 'videojs') {
        await this.initializeVideoJS();
      }
      
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load video source
   * @param src - Video source URL
   */
  public async loadSource(src: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.hlsService) {
        await this.hlsService.loadSource(src);
      } else if (this.videojsService) {
        this.videojsService.loadSource(src);
      }
    } catch (error) {
      throw new Error(`Failed to load source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available quality levels
   * @returns Array of quality levels
   */
  public getQualityLevels(): VideoQualityLevel[] {
    if (this.hlsService) {
      return this.hlsService.getQualityLevels();
    } else if (this.videojsService) {
      return this.videojsService.getQualityLevels();
    }
    return [];
  }

  /**
   * Set quality level
   * @param levelIndex - Quality level index (-1 for auto)
   */
  public setQualityLevel(levelIndex: number): void {
    if (this.hlsService) {
      this.hlsService.setQualityLevel(levelIndex);
    } else if (this.videojsService) {
      this.videojsService.setQualityLevel(levelIndex);
    }
  }

  /**
   * Play video
   */
  public async play(): Promise<void> {
    if (this.videojsService) {
      return this.videojsService.play();
    } else if (this.videoElement) {
      return this.videoElement.play();
    }
  }

  /**
   * Pause video
   */
  public pause(): void {
    if (this.videojsService) {
      this.videojsService.pause();
    } else if (this.videoElement) {
      this.videoElement.pause();
    }
  }

  /**
   * Get current time
   * @returns Current playback time in seconds
   */
  public getCurrentTime(): number {
    if (this.videojsService) {
      return this.videojsService.getCurrentTime();
    }
    return this.videoElement?.currentTime ?? 0;
  }

  /**
   * Set current time
   * @param time - Time in seconds
   */
  public setCurrentTime(time: number): void {
    if (this.videojsService) {
      this.videojsService.setCurrentTime(time);
    } else if (this.videoElement) {
      this.videoElement.currentTime = time;
    }
  }

  /**
   * Get duration
   * @returns Video duration in seconds
   */
  public getDuration(): number {
    if (this.videojsService) {
      return this.videojsService.getDuration();
    }
    return this.videoElement?.duration ?? 0;
  }

  /**
   * Add event listener
   * @param event - Event name
   * @param callback - Event callback
   */
  public addEventListener(event: string, callback: Function): void {
    if (this.hlsService && typeof callback === 'function') {
      this.hlsService.addEventListener(event, callback as any);
    } else if (this.videojsService) {
      this.videojsService.addEventListener(event, callback);
    } else if (this.videoElement) {
      this.videoElement.addEventListener(event, callback as EventListener);
    }
  }

  /**
   * Remove event listener
   * @param event - Event name
   * @param callback - Event callback
   */
  public removeEventListener(event: string, callback: Function): void {
    if (this.hlsService && typeof callback === 'function') {
      this.hlsService.removeEventListener(event, callback as any);
    } else if (this.videojsService) {
      this.videojsService.removeEventListener(event, callback);
    } else if (this.videoElement) {
      this.videoElement.removeEventListener(event, callback as EventListener);
    }
  }

  /**
   * Destroy player and cleanup resources
   */
  public destroy(): void {
    if (this.hlsService) {
      this.hlsService.destroy();
      this.hlsService = null;
    }
    
    if (this.videojsService) {
      this.videojsService.dispose();
      this.videojsService = null;
    }

    this.isInitialized = false;
  }

  /**
   * Initialize HLS.js player
   */
  private async initializeHLS(): Promise<void> {
    if (!HLSService.isSupported()) {
      throw new Error('HLS is not supported in this browser');
    }

    this.hlsService = new HLSService();
    this.hlsService.initialize(this.videoElement, this.config.hlsConfig);
  }

  /**
   * Initialize Video.js player
   */
  private async initializeVideoJS(): Promise<void> {
    this.videojsService = new VideoJSService();
    await this.videojsService.initialize(this.videoElement, {
      hls: this.config.hlsConfig,
      ...this.config.videojsOptions
    });
  }

  /**
   * Create video element
   * @param container - Container element
   * @returns Created video element
   */
  private createVideoElement(container: HTMLElement): HTMLVideoElement {
    let videoElement = container.querySelector('video') as HTMLVideoElement;
    
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.controls = this.config.controls ?? true;
      videoElement.autoplay = this.config.autoplay ?? false;
      videoElement.muted = this.config.muted ?? false;
      videoElement.style.width = '100%';
      videoElement.style.height = 'auto';
      
      container.appendChild(videoElement);
    }

    return videoElement;
  }

  /**
   * Get video element
   * @returns HTML video element
   */
  public getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }

  /**
   * Check if player is initialized
   * @returns True if initialized
   */
  public isPlayerInitialized(): boolean {
    return this.isInitialized;
  }
}
