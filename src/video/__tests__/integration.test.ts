import { vi } from 'vitest';
/**
 * Integration tests for video player components
 */

import { VideoPlayerFactory, VideoPlayerType } from '../VideoPlayerFactory';
import type { VideoPlayerConfig, VideoPlayerState } from '../../types/video';

// Mock DOM
class MockHTMLVideoElement {
  id: string = '';
  src: string = '';
  currentTime: number = 0;
  duration: number = 0;
  paused: boolean = true;
  muted: boolean = false;
  volume: number = 1;
  controls: boolean = true;
  autoplay: boolean = false;
  
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  load = vi.fn();
}

// Mock dependencies
vi.mock('hls.js');
vi.mock('video.js');

const mockHls = {
  isSupported: vi.fn(() => true),
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
  levels: [
    { height: 1080, bitrate: 5000000 },
    { height: 720, bitrate: 2500000 },
    { height: 480, bitrate: 1200000 }
  ],
  currentLevel: 1
};

const mockPlayer = {
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  currentTime: vi.fn((time?: number) => {
    if (time !== undefined) return mockPlayer;
    return 45;
  }),
  duration: vi.fn(() => 180),
  paused: vi.fn(() => false),
  muted: vi.fn((muted?: boolean) => {
    if (muted !== undefined) return mockPlayer;
    return false;
  }),
  volume: vi.fn((volume?: number) => {
    if (volume !== undefined) return mockPlayer;
    return 0.7;
  }),
  src: vi.fn(),
  on: vi.fn(),
  dispose: vi.fn(),
  error: vi.fn(() => null)
};

(require('hls.js') as any).default = vi.fn(() => mockHls);
(require('video.js') as any).default = vi.fn(() => mockPlayer);

describe('Video Player Integration', () => {
  let mockVideoElement: MockHTMLVideoElement;
  let config: VideoPlayerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup DOM
    mockVideoElement = new MockHTMLVideoElement();
    mockVideoElement.id = 'integration-test-video';
    
    // Mock getElementById
    vi.spyOn(document, 'getElementById').mockReturnValue(
      mockVideoElement as any
    );

    config = {
      elementId: 'integration-test-video',
      src: 'https://example.com/test.m3u8',
      width: 1280,
      height: 720,
      autoplay: false,
      controls: true
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End HLS Playback', () => {
    it('should create and initialize HLS player successfully', async () => {
      const player = VideoPlayerFactory.createPlayer(config, VideoPlayerType.HLS);
      
      expect(player).toBeDefined();
      
      await player.initialize();
      
      expect(require('video.js').default).toHaveBeenCalledWith(
        mockVideoElement,
        expect.objectContaining({
          width: 1280,
          height: 720,
          controls: true,
          autoplay: false
        })
      );
      
      expect(require('hls.js').default).toHaveBeenCalled();
      expect(mockHls.loadSource).toHaveBeenCalledWith(config.src);
      expect(mockHls.attachMedia).toHaveBeenCalledWith(mockVideoElement);
    });

    it('should handle complete playback lifecycle', async () => {
      const player = VideoPlayerFactory.createPlayer(config);
      const eventHandlers = {
        ready: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        qualityChanged: vi.fn()
      };

      // Setup event listeners
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        player.on(event as any, handler);
      });

      // Initialize
      await player.initialize();
      expect(eventHandlers.ready).toHaveBeenCalled();

      // Start playback
      await player.play();
      expect(mockPlayer.play).toHaveBeenCalled();

      // Check state during playback
      const playingState = player.getState();
      expect(playingState.playing).toBe(true);
      expect(playingState.currentTime).toBe(45);
      expect(playingState.duration).toBe(180);
      expect(playingState.volume).toBe(0.7);
      expect(playingState.qualityLevels).toHaveLength(3);

      // Change quality
      player.setQualityLevel(0);
      expect(mockHls.currentLevel).toBe(0);
      expect(eventHandlers.qualityChanged).toHaveBeenCalledWith(0);

      // Adjust volume
      player.setVolume(0.5);
      expect(mockPlayer.volume).toHaveBeenCalledWith(0.5);

      // Seek
      player.seek(90);
      expect(mockPlayer.currentTime).toHaveBeenCalledWith(90);

      // Pause
      player.pause();
      expect(mockPlayer.pause).toHaveBeenCalled();

      // Cleanup
      player.destroy();
      expect(mockHls.destroy).toHaveBeenCalled();
      expect(mockPlayer.dispose).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle initialization errors gracefully', async () => {
      const invalidConfig = {
        elementId: 'non-existent-element',
        src: 'https://example.com/test.m3u8'
      };
      
      vi.spyOn(document, 'getElementById').mockReturnValue(null);
      
      const player = VideoPlayerFactory.createPlayer(invalidConfig);
      const errorHandler = vi.fn();
      player.on('error', errorHandler);

      await expect(player.initialize()).rejects.toThrow(
        "Video element with ID 'non-existent-element' not found"
      );
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Video element with ID 'non-existent-element' not found"
        })
      );
    });

    it('should handle HLS errors during playback', async () => {
      const player = VideoPlayerFactory.createPlayer(config);
      const errorHandler = vi.fn();
      player.on('error', errorHandler);

      await player.initialize();

      // Simulate HLS error
      const hlsErrorCallback = mockHls.on.mock.calls.find(
        call => call[0] === 'hlsError'
      )?.[1];
      
      if (hlsErrorCallback) {
        hlsErrorCallback('hlsError', {
          fatal: true,
          type: 'networkError',
          details: 'manifestLoadError'
        });
        
        expect(errorHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('HLS Error')
          })
        );
      }
    });

    it('should handle Video.js errors', async () => {
      const player = VideoPlayerFactory.createPlayer(config);
      const errorHandler = vi.fn();
      player.on('error', errorHandler);

      await player.initialize();

      // Mock Video.js error
      const videoError = {
        message: 'Network error occurred'
      };
      mockPlayer.error.mockReturnValue(videoError);

      // Simulate Video.js error event
      const errorCallback = mockPlayer.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      if (errorCallback) {
        errorCallback();
        
        expect(errorHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Video.js Error: Network error occurred'
          })
        );
      }
    });
  });

  describe('Multi-format Support', () => {
    it('should handle MP4 sources', async () => {
      const mp4Config = {
        ...config,
        src: 'https://example.com/video.mp4'
      };
      
      const player = VideoPlayerFactory.createPlayer(mp4Config);
      await player.initialize();
      
      expect(mockPlayer.src).toHaveBeenCalledWith(mp4Config.src);
    });

    it('should auto-detect and create appropriate player type', () => {
      const hlsPlayer = VideoPlayerFactory.createPlayer({
        elementId: 'test',
        src: 'https://example.com/stream.m3u8'
      });
      
      const mp4Player = VideoPlayerFactory.createPlayer({
        elementId: 'test',
        src: 'https://example.com/video.mp4'
      });
      
      expect(hlsPlayer).toBeDefined();
      expect(mp4Player).toBeDefined();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should properly cleanup resources on destroy', async () => {
      const player = VideoPlayerFactory.createPlayer(config);
      
      await player.initialize();
      
      // Verify resources are created
      expect(require('hls.js').default).toHaveBeenCalled();
      expect(require('video.js').default).toHaveBeenCalled();
      
      // Destroy and verify cleanup
      player.destroy();
      
      expect(mockHls.destroy).toHaveBeenCalled();
      expect(mockPlayer.dispose).toHaveBeenCalled();
      
      // Should handle multiple destroy calls
      expect(() => player.destroy()).not.toThrow();
    });

    it('should handle rapid state changes', async () => {
      const player = VideoPlayerFactory.createPlayer(config);
      await player.initialize();
      
      // Rapid operations
      await player.play();
      player.pause();
      player.seek(30);
      player.setVolume(0.8);
      player.setMuted(true);
      player.setQualityLevel(2);
      
      const finalState = player.getState();
      expect(finalState).toBeDefined();
      expect(typeof finalState.currentTime).toBe('number');
      expect(typeof finalState.duration).toBe('number');
      expect(typeof finalState.playing).toBe('boolean');
    });
  });
});