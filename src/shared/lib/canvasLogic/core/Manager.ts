/**
 * Base class for all game managers
 * Provides common lifecycle methods and structure for game-specific managers
 */
export abstract class Manager {
  protected initialized: boolean = false;
  protected destroyed: boolean = false;

  /**
   * Initialize the manager
   * Called when the manager is first created
   */
  public initialize?(): void {
    this.initialized = true;
    // Optional: subclasses can override
  }

  /**
   * Update the manager state
   * Called each frame during the game loop
   * @param deltaTime - Time elapsed since last update in seconds (optional)
   */
  public update?(deltaTime?: number): void {
    // Optional: subclasses can override
  }

  /**
   * Clean up resources
   * Called when the manager is being destroyed
   */
  public destroy?(): void {
    this.destroyed = true;
    // Optional: subclasses can override
  }

  /**
   * Handle resize events
   * Called when the canvas or viewport size changes
   * @param width - New width
   * @param height - New height
   */
  public resize?(width: number, height: number): void {
    // Optional: subclasses can override
  }

  /**
   * Check if the manager has been initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if the manager has been destroyed
   */
  public isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Update configuration (for config-based managers)
   * @param config - Partial configuration to merge
   */
  public updateConfig?<T extends Record<string, unknown>>(config: Partial<T>): void {
    // Optional: subclasses can override
  }
}

