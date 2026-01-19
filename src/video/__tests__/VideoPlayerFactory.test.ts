import { vi, Mock } from 'vitest';
/**
 * Video Player Factory tests
 */

import { VideoPlayerFactory, VideoPlayerType } from '../VideoPlayerFactory';
import { HLSVideoPlayer } from '../HLSVideoPlayer';
import type { VideoPlayerConfig } from '../../types/video';

// Mock HLSVideoPlayer
vi.mock('../HLSVideoPlayer');
vi.mock('hls.js');

const MockedHLSVideoPlayer = HLSVideoPlayer as Mock<typeof HLSVideoPlayer>;

describe('VideoPlayerFactory', () => {
  let config: VideoPlayerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      elementId: 'test-video',
      src: 'https://example.com/video.mp4'
    };
  });

  describe('createPlayer', () => {
    it('should create HLS player for HLS sources', () => {
      const hlsConfig = {
        ...config,
        src: 'https://example.com/video.m3u8'
      };

      const player = VideoPlayerFactory.createPlayer(hlsConfig);

      expect(MockedHLSVideoPlayer).toHaveBeenCalledWith(hlsConfig);
      expect(player).toBeInstanceOf(HLSVideoPlayer);
    });

    it('should create HLS player for application/x-mpegURL sources', () => {
      const hlsConfig = {
        ...config,
        src: 'https://example.com/playlist?type=application/x-mpegURL'
      };

      const player = VideoPlayerFactory.createPlayer(hlsConfig);

      expect(MockedHLSVideoPlayer).toHaveBeenCalledWith(hlsConfig);
    });

    it('should create standard player for MP4 sources', () => {
      const player = VideoPlayerFactory.createPlayer(config);

      expect(MockedHLSVideoPlayer).toHaveBeenCalledWith(config);
      expect(player).toBeInstanceOf(HLSVideoPlayer);
    });

    it('should create player with explicit type', () => {
      const player = VideoPlayerFactory.createPlayer(
        config,
        VideoPlayerType.HLS
      );

      expect(MockedHLSVideoPlayer).toHaveBeenCalledWith(config);
    });

    it('should throw error for unsupported player type', () => {
      expect(() => {
        VideoPlayerFactory.createPlayer(
          config,
          'unsupported' as VideoPlayerType
        );
      }).toThrow('Unsupported video player type: unsupported');
    });
  });

  describe('detectPlayerType', () => {
    it('should detect HLS type for .m3u8 sources', () => {
      const hlsConfig = {
        ...config,
        src: 'https://example.com/video.m3u8'
      };

      const player = VideoPlayerFactory.createPlayer(hlsConfig);
      expect(MockedHLSVideoPlayer).toHaveBeenCalled();
    });

    it('should detect standard type for other sources', () => {
      const standardConfig = {
        ...config,
        src: 'https://example.com/video.mp4'
      };

      const player = VideoPlayerFactory.createPlayer(standardConfig);
      expect(MockedHLSVideoPlayer).toHaveBeenCalled();
    });
  });

  describe('isHLSSupported', () => {
    it('should return true when HLS is supported', () => {
      const mockHls = {
        isSupported: vi.fn(() => true)
      };
      
      // Mock require to return our mock
      const originalRequire = require;
      (global as any).require = vi.fn((module) => {
        if (module === 'hls.js') {
          return { default: mockHls };
        }
        return originalRequire(module);
      });

      const isSupported = VideoPlayerFactory.isHLSSupported();
      expect(isSupported).toBe(true);

      // Restore require
      (global as any).require = originalRequire;
    });

    it('should return false when HLS is not available', () => {
      // Mock require to throw
      const originalRequire = require;
      (global as any).require = vi.fn(() => {
        throw new Error('Module not found');
      });

      const isSupported = VideoPlayerFactory.isHLSSupported();
      expect(isSupported).toBe(false);

      // Restore require
      (global as any).require = originalRequire;
    });
  });

  describe('getSupportedFormats', () => {
    it('should return basic formats when HLS not supported', () => {
      vi.spyOn(VideoPlayerFactory, 'isHLSSupported').mockReturnValue(false);
      
      const formats = VideoPlayerFactory.getSupportedFormats();
      
      expect(formats).toEqual(['mp4', 'webm', 'ogg']);
    });

    it('should include HLS formats when supported', () => {
      vi.spyOn(VideoPlayerFactory, 'isHLSSupported').mockReturnValue(true);
      
      const formats = VideoPlayerFactory.getSupportedFormats();
      
      expect(formats).toEqual(['mp4', 'webm', 'ogg', 'm3u8', 'hls']);
    });
  });
});