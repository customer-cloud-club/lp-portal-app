import { AdminStats, AdminSettings } from '../types/admin.js';

/**
 * Service class for admin panel operations
 */
export class AdminService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch admin statistics
   * @returns Promise resolving to admin statistics
   * @throws Error when API call fails
   */
  async getStats(): Promise<AdminStats> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        ...data,
        lastUpdated: new Date(data.lastUpdated)
      };
    } catch (error) {
      throw new Error(`Error fetching admin stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch admin settings
   * @returns Promise resolving to admin settings
   * @throws Error when API call fails
   */
  async getSettings(): Promise<AdminSettings> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Error fetching admin settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update admin settings
   * @param settings - New settings to apply
   * @returns Promise resolving to updated settings
   * @throws Error when API call fails
   */
  async updateSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Error updating admin settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get authentication token from localStorage or sessionStorage
   * @returns Authentication token
   * @private
   */
  private getAuthToken(): string {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    return token;
  }
}
