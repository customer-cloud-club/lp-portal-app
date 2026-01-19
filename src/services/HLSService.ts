import Hls from 'hls.js';
import { HLSConfig, HLSEventData, VideoQualityLevel } from '../types/hls';

/**
 * Service for managing HLS streaming functionality
 */
export class HLSService {
  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  /**
   * Initialize HLS service with video element
   * @param videoElement - HTML video element
   * @param config - HLS configuration options
   */
  public initialize(videoElement: HTMLVideoElement, config: HLSConfig = {}): void {
    if (!Hls.isSupported()) {
      throw new Error('HLS is not supported in this browser');
    }

    this.videoElement = videoElement;
    this.hls = new Hls({
      autoStartLoad: config.autoStartLoad ?? true,
      startPosition: config.startPosition ?? -1,
      debug: config.debug ?? false,
      enableWorker: config.enableWorker ?? true,
      lowLatencyMode: config.lowLatencyMode ?? false,
      backBufferLength: config.backBufferLength ?? 90,
      ...config
    });

    this.setupEventListeners();
  }

  /**
   * Load HLS stream from URL
   * @param url - HLS manifest URL
   */
  public async loadSource(url: string): Promise<void> {
    if (!this.hls || !this.videoElement) {
      throw new Error('HLS service not initialized');
    }

    try {
      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoElement);
      
      return new Promise((resolve, reject) => {
        const onManifestParsed = (): void => {
          this.hls?.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
          this.hls?.off(Hls.Events.ERROR, onError);
          resolve();
        };

        const onError = (event: string, data: any): void => {
          this.hls?.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
          this.hls?.off(Hls.Events.ERROR, onError);
          reject(new Error(`HLS Error: ${data.details}`));
        };

        this.hls?.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
        this.hls?.on(Hls.Events.ERROR, onError);
      });
    } catch (error) {
      throw new Error(`Failed to load HLS source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available quality levels
   * @returns Array of available quality levels
   */
  public getQualityLevels(): VideoQualityLevel[] {
    if (!this.hls) {
      return [];
    }

    return this.hls.levels.map((level, index) => ({
      height: level.height,
      width: level.width,
      bitrate: level.bitrate,
      name: `${level.height}p`,
      index
    }));
  }

  /**
   * Set quality level
   * @param levelIndex - Quality level index (-1 for auto)
   */
  public setQualityLevel(levelIndex: number): void {
    if (!this.hls) {
      throw new Error('HLS service not initialized');
    }

    this.hls.currentLevel = levelIndex;
  }

  /**
   * Get current quality level
   * @returns Current quality level index
   */
  public getCurrentQualityLevel(): number {
    return this.hls?.currentLevel ?? -1;
  }

  /**
   * Add event listener
   * @param event - Event name
   * @param callback - Event callback
   */
  public addEventListener(event: string, callback: (data: HLSEventData) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  /**
   * Remove event listener
   * @param event - Event name
   * @param callback - Event callback
   */
  public removeEventListener(event: string, callback: (data: HLSEventData) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Setup internal HLS event listeners
   */
  private setupEventListeners(): void {
    if (!this.hls) return;

    this.hls.on(Hls.Events.ERROR, (event: string, data: any) => {
      const eventData: HLSEventData = {
        type: event,
        details: data.details,
        fatal: data.fatal,
        error: data.error
      };
      this.emitEvent('error', eventData);
    });

    this.hls.on(Hls.Events.MANIFEST_PARSED, (event: string, data: any) => {
      const eventData: HLSEventData = {
        type: event,
        details: 'manifest-parsed'
      };
      this.emitEvent('manifestParsed', eventData);
    });

    this.hls.on(Hls.Events.LEVEL_LOADED, (event: string, data: any) => {
      const eventData: HLSEventData = {
        type: event,
        details: 'level-loaded'
      };
      this.emitEvent('levelLoaded', eventData);
    });
  }

  /**
   * Emit custom event
   * @param event - Event name
   * @param data - Event data
   */
  private emitEvent(event: string, data: HLSEventData): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Destroy HLS instance and cleanup
   */
  public destroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.videoElement = null;
    this.eventListeners.clear();
  }

  /**
   * Check if HLS is supported
   * @returns True if HLS is supported
   */
  public static isSupported(): boolean {
    return Hls.isSupported();
  }
}
