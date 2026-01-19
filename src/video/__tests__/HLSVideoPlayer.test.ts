import { vi } from 'vitest';
/**
 * HLS Video Player tests
 */

import { HLSVideoPlayer } from '../HLSVideoPlayer';
import type { VideoPlayerConfig } from '../../types/video';

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
    { height: 720, bitrate: 2000000 },
    { height: 480, bitrate: 1000000 }
  ],
  currentLevel: 0
};

const mockPlayer = {
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  currentTime: vi.fn(() => 30),
  duration: vi.fn(() => 120),
  paused: vi.fn(() => false),
  muted: vi.fn(() => false),
  volume: vi.fn(() => 0.8),
  src: vi.fn(),
  on: vi.fn(),
  dispose: vi.fn(),
  error: vi.fn(() => null)
};

// Mock constructors
(require('hls.js') as any).default = vi.fn(() => mockHls);
(require('video.js') as any).default = vi.fn(() => mockPlayer);

describe('HLSVideoPlayer', () => {
  let player: HLSVideoPlayer;
  let config: VideoPlayerConfig;
  let mockVideoElement: HTMLVideoElement;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock video element
    mockVideoElement = document.createElement('video');
    mockVideoElement.id = 'test-video';
    document.body.appendChild(mockVideoElement);

    config = {
      elementId: 'test-video',
      src: 'https://example.com/video.m3u8',
      width: 800,
      height: 450,
      autoplay: false,
      controls: true
    };

    player = new HLSVideoPlayer(config);
  });

  afterEach(() => {
    if (mockVideoElement && mockVideoElement.parentNode) {
      mockVideoElement.parentNode.removeChild(mockVideoElement);
    }
    player.destroy();
  });

  describe('constructor', () => {
    it('should create player with default config', () => {
      const minimalConfig: VideoPlayerConfig = {
        elementId: 'test-video',
        src: 'https://example.com/video.m3u8'
      };
      const playerWithDefaults = new HLSVideoPlayer(minimalConfig);
      expect(playerWithDefaults).toBeInstanceOf(HLSVideoPlayer);
    });

    it('should merge provided config with defaults', () => {
      expect(player).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with HLS source', async () => {
      const readyHandler = vi.fn();
      player.on('ready', readyHandler);

      await player.initialize();

      expect(require('video.js').default).toHaveBeenCalledWith(
        mockVideoElement,
        expect.objectContaining({
          width: 800,
          height: 450,
          controls: true,
          autoplay: false
        })
      );
      expect(require('hls.js').default).toHaveBeenCalled();
      expect(readyHandler).toHaveBeenCalled();
    });

    it('should throw error if video element not found', async () => {
      const invalidConfig = {
        elementId: 'non-existent',
        src: 'https://example.com/video.m3u8'
      };
      const invalidPlayer = new HLSVideoPlayer(invalidConfig);
      const errorHandler = vi.fn();
      invalidPlayer.on('error', errorHandler);

      await expect(invalidPlayer.initialize()).rejects.toThrow(
        "Video element with ID 'non-existent' not found"
      );
    });

    it('should handle non-HLS sources', async () => {
      const nonHlsConfig = {
        ...config,
        src: 'https://example.com/video.mp4'
      };
      const nonHlsPlayer = new HLSVideoPlayer(nonHlsConfig);
      
      await nonHlsPlayer.initialize();
      
      expect(mockPlayer.src).toHaveBeenCalledWith('https://example.com/video.mp4');
    });
  });

  describe('play', () => {
    beforeEach(async () => {
      await player.initialize();
    });

    it('should play video successfully', async () => {
      await player.play();
      expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('should throw error if player not initialized', async () => {
      const uninitializedPlayer = new HLSVideoPlayer(config);
      await expect(uninitializedPlayer.play()).rejects.toThrow(
        'Player not initialized'
      );
    });

    it('should handle play errors', async () => {
      const playError = new Error('Play failed');
      mockPlayer.play.mockRejectedValueOnce(playError);
      const errorHandler = vi.fn();
      player.on('error', errorHandler);

      await expect(player.play()).rejects.toThrow('Play failed');
      expect(errorHandler).toHaveBeenCalledWith(playError);
    });
  });

  describe('pause', () => {
    beforeEach(async () => {
      await player.initialize();
    });

    it('should pause video', () => {
      player.pause();
      expect(mockPlayer.pause).toHaveBeenCalled();
    });

    it('should throw error if player not initialized', () => {
      const uninitializedPlayer = new HLSVideoPlayer(config);
      expect(() => uninitializedPlayer.pause()).toThrow(
        'Player not initialized'
      );
    });
  });

  describe('seek', () => {
    beforeEach(async () => {
      await player.initialize();
    });

    it('should seek to specified time', () => {
      player.seek(60);
      expect(mockPlayer.currentTime).toHaveBeenCalledWith(60);
    });

    it('should throw error if player not initialized', () => {
      const uninitializedPlayer = new HLSVideoPlayer(config);
      expect(() => uninitializedPlayer.seek(30)).toThrow(
        'Player not initialized'
      );
    });
  });

  describe('setVolume', () => {
    beforeEach(async () => {
      await player.initialize();
    });

    it('should set volume', () => {
      player.setVolume(0.5);
      expect(mockPlayer.volume).toHaveBeenCalledWith(0.5);
    });

    it('should clamp volume to valid range', () => {
      player.setVolume(1.5);
      expect(mockPlayer.volume).toHaveBeenCalledWith(1);
      
      player.setVolume(-0.5);
      expect(mockPlayer.volume).toHaveBeenCalledWith(0);
    });
  });

  describe('setMuted', () => {
    beforeEach(async () => {
      await player.initialize();
    });

    it('should set muted state', () => {
      player.setMuted(true);
      expect(mockPlayer.muted).toHaveBeenCalledWith(true);
    });
  });

  describe('setQualityLevel', () => {
    beforeEach(async () => {
      await player.initialize();
    });

    it('should set quality level', () => {
      const qualityHandler = vi.fn();
      player.on('qualityChanged', qualityHandler);
      
      player.setQualityLevel(1);
      
      expect(mockHls.currentLevel).toBe(1);
      expect(qualityHandler).toHaveBeenCalledWith(1);
    });
  });

  describe('getState', () => {
    beforeEach(async () => {
      await player.initialize();
    });

    it('should return current player state', () => {
      const state = player.getState();
      
      expect(state).toEqual({
        currentTime: 30,
        duration: 120,
        playing: true,
        muted: false,
        volume: 0.8,
        qualityLevel: 0,
        qualityLevels: [
          { level: 0, height: 720, bitrate: 2000000 },
          { level: 1, height: 480, bitrate: 1000000 }
        ]
      });
    });
  });

  describe('event handling', () => {
    it('should add and remove event listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      player.on('play', handler1);
      player.on('play', handler2);
      
      // Simulate play event
      (player as any).emit('play');
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      
      // Remove one handler
      player.off('play', handler1);
      vi.clearAllMocks();
      
      (player as any).emit('play');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle errors in event handlers gracefully', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      
      player.on('play', errorHandler);
      (player as any).emit('play');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in event handler for 'play':",
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      await player.initialize();
    });

    it('should clean up resources', () => {
      player.destroy();
      
      expect(mockHls.destroy).toHaveBeenCalled();
      expect(mockPlayer.dispose).toHaveBeenCalled();
    });

    it('should handle multiple destroy calls', () => {
      player.destroy();
      expect(() => player.destroy()).not.toThrow();
    });
  });
});