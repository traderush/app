import { Manager } from '../../../core/Manager';

/**
 * Manages other players' data for overlay rendering
 */
export class OtherPlayerManager extends Manager {
  private otherPlayerCounts: {[key: string]: number} = {};
  private otherPlayerSelections: {[key: string]: Array<{id: string, name: string, avatar: string, type: string}>} = {};
  private otherPlayerImages: {[key: string]: HTMLImageElement} = {};

  constructor() {
    super();
    this.initialized = true;
  }

  /**
   * Set other player data
   */
  public setOtherPlayerData(
    playerCounts: {[key: string]: number}, 
    playerSelections: {[key: string]: Array<{id: string, name: string, avatar: string, type: string}>},
    playerImages: {[key: string]: HTMLImageElement}
  ): void {
    this.otherPlayerCounts = playerCounts;
    this.otherPlayerSelections = playerSelections;
    this.otherPlayerImages = playerImages;
  }

  /**
   * Get other player counts
   */
  public getOtherPlayerCounts(): {[key: string]: number} {
    return this.otherPlayerCounts;
  }

  /**
   * Get other player selections
   */
  public getOtherPlayerSelections(): {[key: string]: Array<{id: string, name: string, avatar: string, type: string}>} {
    return this.otherPlayerSelections;
  }

  /**
   * Get other player images
   */
  public getOtherPlayerImages(): {[key: string]: HTMLImageElement} {
    return this.otherPlayerImages;
  }

  /**
   * Get all other player data
   */
  public getOtherPlayerData(): {
    otherPlayerCounts: {[key: string]: number};
    otherPlayerSelections: {[key: string]: Array<{id: string, name: string, avatar: string, type: string}>};
    otherPlayerImages: {[key: string]: HTMLImageElement};
  } {
    return {
      otherPlayerCounts: this.otherPlayerCounts,
      otherPlayerSelections: this.otherPlayerSelections,
      otherPlayerImages: this.otherPlayerImages,
    };
  }
}

