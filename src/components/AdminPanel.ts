import { AdminService } from '../services/adminService.js';
import { AdminStats, AdminSettings, AdminPanelState } from '../types/admin.js';

/**
 * Admin panel component for displaying stats and managing settings
 */
export class AdminPanel {
  private readonly adminService: AdminService;
  private readonly container: HTMLElement;
  private state: AdminPanelState;

  constructor(container: HTMLElement, adminService?: AdminService) {
    this.container = container;
    this.adminService = adminService || new AdminService();
    this.state = {
      isLoading: false,
      error: null,
      stats: null,
      settings: null
    };

    this.init();
  }

  /**
   * Initialize the admin panel
   * @private
   */
  private async init(): Promise<void> {
    try {
      this.render();
      await this.loadData();
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to initialize admin panel');
    }
  }

  /**
   * Load stats and settings data
   * @private
   */
  private async loadData(): Promise<void> {
    this.setState({ isLoading: true, error: null });

    try {
      const [stats, settings] = await Promise.all([
        this.adminService.getStats(),
        this.adminService.getSettings()
      ]);

      this.setState({
        isLoading: false,
        stats,
        settings
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to load data');
    }
  }

  /**
   * Handle settings update
   * @param newSettings - Partial settings to update
   * @private
   */
  private async handleSettingsUpdate(newSettings: Partial<AdminSettings>): Promise<void> {
    if (!this.state.settings) return;

    try {
      this.setState({ isLoading: true, error: null });
      const updatedSettings = await this.adminService.updateSettings(newSettings);
      this.setState({
        isLoading: false,
        settings: updatedSettings
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to update settings');
    }
  }

  /**
   * Update component state and re-render
   * @param newState - Partial state to update
   * @private
   */
  private setState(newState: Partial<AdminPanelState>): void {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  /**
   * Handle errors
   * @param message - Error message
   * @private
   */
  private handleError(message: string): void {
    this.setState({
      isLoading: false,
      error: message
    });
  }

  /**
   * Render the admin panel
   * @private
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="admin-panel">
        <h1>Admin Panel</h1>
        ${this.renderError()}
        ${this.renderLoading()}
        ${this.renderStats()}
        ${this.renderSettings()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render error message
   * @returns HTML string
   * @private
   */
  private renderError(): string {
    if (!this.state.error) return '';
    return `<div class="error-message">Error: ${this.state.error}</div>`;
  }

  /**
   * Render loading indicator
   * @returns HTML string
   * @private
   */
  private renderLoading(): string {
    if (!this.state.isLoading) return '';
    return '<div class="loading">Loading...</div>';
  }

  /**
   * Render statistics section
   * @returns HTML string
   * @private
   */
  private renderStats(): string {
    if (!this.state.stats) return '';

    const { stats } = this.state;
    const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks * 100).toFixed(1) : '0';

    return `
      <section class="stats-section">
        <h2>Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Users</h3>
            <p class="stat-number">${stats.totalUsers}</p>
            <small>${stats.activeUsers} active</small>
          </div>
          <div class="stat-card">
            <h3>Tasks</h3>
            <p class="stat-number">${stats.totalTasks}</p>
            <small>${completionRate}% completed</small>
          </div>
          <div class="stat-card">
            <h3>Pending</h3>
            <p class="stat-number">${stats.pendingTasks}</p>
            <small>tasks waiting</small>
          </div>
          <div class="stat-card">
            <h3>Uptime</h3>
            <p class="stat-number">${Math.floor(stats.uptime / 3600)}h</p>
            <small>system uptime</small>
          </div>
        </div>
        <p class="last-updated">Last updated: ${stats.lastUpdated.toLocaleString()}</p>
      </section>
    `;
  }

  /**
   * Render settings section
   * @returns HTML string
   * @private
   */
  private renderSettings(): string {
    if (!this.state.settings) return '';

    const { settings } = this.state;

    return `
      <section class="settings-section">
        <h2>Settings</h2>
        <form class="settings-form">
          <div class="form-group">
            <label for="maxTasksPerUser">Max Tasks Per User:</label>
            <input type="number" id="maxTasksPerUser" value="${settings.maxTasksPerUser}" min="1" max="1000">
          </div>
          <div class="form-group">
            <label for="autoCleanupDays">Auto Cleanup Days:</label>
            <input type="number" id="autoCleanupDays" value="${settings.autoCleanupDays}" min="1" max="365">
          </div>
          <div class="form-group">
            <label for="apiRateLimit">API Rate Limit (per minute):</label>
            <input type="number" id="apiRateLimit" value="${settings.apiRateLimit}" min="10" max="10000">
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="enableNotifications" ${settings.enableNotifications ? 'checked' : ''}>
              Enable Notifications
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="emailNotifications" ${settings.emailNotifications ? 'checked' : ''}>
              Email Notifications
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="debugMode" ${settings.debugMode ? 'checked' : ''}>
              Debug Mode
            </label>
          </div>
          <button type="submit" class="btn-primary">Save Settings</button>
          <button type="button" class="btn-secondary" id="refreshBtn">Refresh Data</button>
        </form>
      </section>
    `;
  }

  /**
   * Attach event listeners
   * @private
   */
  private attachEventListeners(): void {
    const form = this.container.querySelector('.settings-form') as HTMLFormElement;
    const refreshBtn = this.container.querySelector('#refreshBtn') as HTMLButtonElement;

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(form);
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadData();
      });
    }
  }

  /**
   * Handle form submission
   * @param form - Form element
   * @private
   */
  private handleFormSubmit(form: HTMLFormElement): void {
    const formData = new FormData(form);
    const settings: Partial<AdminSettings> = {};

    // Get numeric values
    const maxTasksPerUser = parseInt((form.querySelector('#maxTasksPerUser') as HTMLInputElement).value);
    const autoCleanupDays = parseInt((form.querySelector('#autoCleanupDays') as HTMLInputElement).value);
    const apiRateLimit = parseInt((form.querySelector('#apiRateLimit') as HTMLInputElement).value);

    if (!isNaN(maxTasksPerUser)) settings.maxTasksPerUser = maxTasksPerUser;
    if (!isNaN(autoCleanupDays)) settings.autoCleanupDays = autoCleanupDays;
    if (!isNaN(apiRateLimit)) settings.apiRateLimit = apiRateLimit;

    // Get boolean values
    settings.enableNotifications = (form.querySelector('#enableNotifications') as HTMLInputElement).checked;
    settings.emailNotifications = (form.querySelector('#emailNotifications') as HTMLInputElement).checked;
    settings.debugMode = (form.querySelector('#debugMode') as HTMLInputElement).checked;

    this.handleSettingsUpdate(settings);
  }

  /**
   * Destroy the component and clean up
   */
  public destroy(): void {
    this.container.innerHTML = '';
  }
}
