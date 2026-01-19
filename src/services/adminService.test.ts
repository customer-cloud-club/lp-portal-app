import { vi, Mock } from 'vitest';
import { AdminService } from './adminService.js';
import { Statistics, Settings } from '../types/admin.js';

// Mock fetch globally
global.fetch = vi.fn();
const mockFetch = fetch as Mock<typeof fetch>;

describe('AdminService', () => {
  let adminService: AdminService;
  const baseUrl = '/api/admin';

  beforeEach(() => {
    adminService = new AdminService(baseUrl);
    mockFetch.mockClear();
  });

  describe('getStatistics', () => {
    const mockStatistics: Statistics = {
      totalUsers: 100,
      activeSessions: 25,
      totalTransactions: 1000,
      uptime: 86400,
      memoryUsage: 512.5,
      cpuUsage: 75.2,
      lastUpdated: new Date('2023-01-01T12:00:00Z')
    };

    it('should fetch statistics successfully', async () => {
      const mockResponse = {
        ...mockStatistics,
        lastUpdated: '2023-01-01T12:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await adminService.getStatistics();

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/statistics`);
      expect(result).toEqual(mockStatistics);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      await expect(adminService.getStatistics()).rejects.toThrow('Failed to fetch statistics: HTTP error! status: 500');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adminService.getStatistics()).rejects.toThrow('Failed to fetch statistics: Network error');
    });
  });

  describe('getSettings', () => {
    const mockSettings: Settings = {
      appName: 'Test App',
      maxUsers: 1000,
      sessionTimeout: 30,
      enableLogging: true,
      enableNotifications: false,
      maintenanceMode: false,
      apiRateLimit: 100
    };

    it('should fetch settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings
      } as Response);

      const result = await adminService.getSettings();

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/settings`);
      expect(result).toEqual(mockSettings);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);

      await expect(adminService.getSettings()).rejects.toThrow('Failed to fetch settings: HTTP error! status: 404');
    });
  });

  describe('updateSettings', () => {
    const mockSettings: Settings = {
      appName: 'Updated App',
      maxUsers: 2000,
      sessionTimeout: 60,
      enableLogging: false,
      enableNotifications: true,
      maintenanceMode: true,
      apiRateLimit: 200
    };

    it('should update settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings
      } as Response);

      const result = await adminService.updateSettings(mockSettings);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockSettings)
      });
      expect(result).toEqual(mockSettings);
    });

    it('should handle update errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      } as Response);

      await expect(adminService.updateSettings(mockSettings)).rejects.toThrow('Failed to update settings: HTTP error! status: 400');
    });
  });

  describe('refreshStatistics', () => {
    const mockStatistics: Statistics = {
      totalUsers: 150,
      activeSessions: 30,
      totalTransactions: 1500,
      uptime: 90000,
      memoryUsage: 600.0,
      cpuUsage: 80.5,
      lastUpdated: new Date('2023-01-01T13:00:00Z')
    };

    it('should refresh statistics successfully', async () => {
      const mockResponse = {
        ...mockStatistics,
        lastUpdated: '2023-01-01T13:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await adminService.refreshStatistics();

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/statistics/refresh`, {
        method: 'POST'
      });
      expect(result).toEqual(mockStatistics);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle refresh errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      } as Response);

      await expect(adminService.refreshStatistics()).rejects.toThrow('Failed to refresh statistics: HTTP error! status: 503');
    });
  });

  describe('constructor', () => {
    it('should use default base URL when not provided', () => {
      const service = new AdminService();
      expect(service).toBeInstanceOf(AdminService);
    });

    it('should use custom base URL when provided', () => {
      const customUrl = '/custom/api';
      const service = new AdminService(customUrl);
      expect(service).toBeInstanceOf(AdminService);
    });
  });
});