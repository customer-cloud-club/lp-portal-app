import { vi, Mock } from 'vitest';
import { AdminPanel } from './AdminPanel.js';
import { AdminService } from '../services/adminService.js';
import { Statistics, Settings } from '../types/admin.js';

// Mock AdminService
vi.mock('../services/adminService.js');
const MockAdminService = AdminService as Mock<typeof AdminService>;

// Mock timers
vi.useFakeTimers();

describe('AdminPanel', () => {
  let container: HTMLElement;
  let mockAdminService: Mock<AdminService>;
  let adminPanel: AdminPanel;
  
  const mockStatistics: Statistics = {
    totalUsers: 100,
    activeSessions: 25,
    totalTransactions: 1000,
    uptime: 86400,
    memoryUsage: 512.5,
    cpuUsage: 75.2,
    lastUpdated: new Date('2023-01-01T12:00:00Z')
  };
  
  const mockSettings: Settings = {
    appName: 'Test App',
    maxUsers: 1000,
    sessionTimeout: 30,
    enableLogging: true,
    enableNotifications: false,
    maintenanceMode: false,
    apiRateLimit: 100
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    
    mockAdminService = {
      getStatistics: vi.fn(),
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      refreshStatistics: vi.fn()
    } as unknown as Mock<AdminService>;
    
    MockAdminService.mockImplementation(() => mockAdminService);
  });

  afterEach(() => {
    if (adminPanel) {
      adminPanel.destroy();
    }
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      mockAdminService.getStatistics.mockImplementation(() => new Promise(() => {}));
      mockAdminService.getSettings.mockImplementation(() => new Promise(() => {}));
      
      adminPanel = new AdminPanel(container, mockAdminService);
      
      expect(container.innerHTML).toContain('Loading...');
      expect(mockAdminService.getStatistics).toHaveBeenCalled();
      expect(mockAdminService.getSettings).toHaveBeenCalled();
    });

    it('should load data successfully on initialization', async () => {
      mockAdminService.getStatistics.mockResolvedValue(mockStatistics);
      mockAdminService.getSettings.mockResolvedValue(mockSettings);
      
      adminPanel = new AdminPanel(container, mockAdminService);
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(container.innerHTML).toContain('Test App');
      expect(container.innerHTML).toContain('100');
      expect(container.innerHTML).not.toContain('Loading...');
    });

    it('should handle initialization errors', async () => {
      const errorMessage = 'Failed to load';
      mockAdminService.getStatistics.mockRejectedValue(new Error(errorMessage));
      mockAdminService.getSettings.mockResolvedValue(mockSettings);
      
      adminPanel = new AdminPanel(container, mockAdminService);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(container.innerHTML).toContain(errorMessage);
    });
  });

  describe('statistics rendering', () => {
    beforeEach(async () => {
      mockAdminService.getStatistics.mockResolvedValue(mockStatistics);
      mockAdminService.getSettings.mockResolvedValue(mockSettings);
      
      adminPanel = new AdminPanel(container, mockAdminService);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should render statistics correctly', () => {
      expect(container.innerHTML).toContain('Total Users');
      expect(container.innerHTML).toContain('100');
      expect(container.innerHTML).toContain('Active Sessions');
      expect(container.innerHTML).toContain('25');
      expect(container.innerHTML).toContain('1d 0h 0m'); // formatted uptime
    });

    it('should handle refresh statistics button click', async () => {
      const refreshedStats = { ...mockStatistics, totalUsers: 150 };
      mockAdminService.refreshStatistics.mockResolvedValue(refreshedStats);
      
      const refreshBtn = container.querySelector('#refresh-stats') as HTMLButtonElement;
      expect(refreshBtn).toBeTruthy();
      
      refreshBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockAdminService.refreshStatistics).toHaveBeenCalled();
      expect(container.innerHTML).toContain('150');
    });
  });

  describe('settings rendering and updates', () => {
    beforeEach(async () => {
      mockAdminService.getStatistics.mockResolvedValue(mockStatistics);
      mockAdminService.getSettings.mockResolvedValue(mockSettings);
      
      adminPanel = new AdminPanel(container, mockAdminService);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should render settings form correctly', () => {
      expect(container.innerHTML).toContain('Application Settings');
      expect(container.querySelector('#appName')).toBeTruthy();
      expect(container.querySelector('#maxUsers')).toBeTruthy();
      expect(container.querySelector('#enableLogging')).toBeTruthy();
      
      const appNameInput = container.querySelector('#appName') as HTMLInputElement;
      expect(appNameInput.value).toBe('Test App');
    });

    it('should handle settings form submission', async () => {
      const updatedSettings = { ...mockSettings, appName: 'Updated App' };
      mockAdminService.updateSettings.mockResolvedValue(updatedSettings);
      
      const appNameInput = container.querySelector('#appName') as HTMLInputElement;
      appNameInput.value = 'Updated App';
      
      const form = container.querySelector('#settings-form') as HTMLFormElement;
      const submitEvent = new Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockAdminService.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
        appName: 'Updated App'
      }));
    });
  });

  describe('auto-refresh functionality', () => {
    beforeEach(async () => {
      mockAdminService.getStatistics.mockResolvedValue(mockStatistics);
      mockAdminService.getSettings.mockResolvedValue(mockSettings);
      
      adminPanel = new AdminPanel(container, mockAdminService);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should setup auto-refresh interval', () => {
      expect(mockAdminService.getStatistics).toHaveBeenCalledTimes(1);
      
      // Fast forward 30 seconds
      vi.advanceTimersByTime(30000);
      
      expect(mockAdminService.getStatistics).toHaveBeenCalledTimes(2);
    });

    it('should handle auto-refresh errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      mockAdminService.getStatistics.mockRejectedValue(new Error('Refresh failed'));
      
      vi.advanceTimersByTime(30000);
      
      expect(consoleSpy).toHaveBeenCalledWith('Auto-refresh failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      mockAdminService.getStatistics.mockResolvedValue(mockStatistics);
      mockAdminService.getSettings.mockResolvedValue(mockSettings);
      
      adminPanel = new AdminPanel(container, mockAdminService);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should format uptime correctly', () => {
      // Test various uptime values through the rendered output
      const testStats = { ...mockStatistics, uptime: 90061 }; // 1 day, 1 hour, 1 minute, 1 second
      mockAdminService.getStatistics.mockResolvedValue(testStats);
      
      const refreshBtn = container.querySelector('#refresh-stats') as HTMLButtonElement;
      refreshBtn.click();
      
      // The formatUptime method should be called internally
      expect(container.innerHTML).toContain('1d 1h 1m');
    });
  });

  describe('cleanup', () => {
    it('should clear interval on destroy', () => {
      mockAdminService.getStatistics.mockResolvedValue(mockStatistics);
      mockAdminService.getSettings.mockResolvedValue(mockSettings);
      
      adminPanel = new AdminPanel(container, mockAdminService);
      
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      adminPanel.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should display error messages', async () => {
      const errorMessage = 'Service unavailable';
      mockAdminService.getStatistics.mockRejectedValue(new Error(errorMessage));
      mockAdminService.getSettings.mockResolvedValue(mockSettings);
      
      adminPanel = new AdminPanel(container, mockAdminService);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(container.innerHTML).toContain(errorMessage);
      expect(container.querySelector('.error')).toBeTruthy();
    });
  });
});