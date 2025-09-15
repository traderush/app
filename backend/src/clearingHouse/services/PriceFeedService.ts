import { EventEmitter } from 'events'
import { CLEARING_HOUSE_CONFIG } from '../config/clearingHouseConfig'
import { MESSAGES, PricePoint } from '../types'


export class PriceFeedService extends EventEmitter {
  private currentPrice: number = CLEARING_HOUSE_CONFIG.constants.initialPrice
  private volatility: number = CLEARING_HOUSE_CONFIG.constants.volatility
  private updateInterval: number = CLEARING_HOUSE_CONFIG.constants.priceUpdateInterval // ms
  private intervalId: NodeJS.Timeout | null = null

  start(): void {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      const price = this.generatePrice()

      this.emit(MESSAGES.PRICE_UPDATE, price)
    }, this.updateInterval)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }


  generatePrice(): PricePoint {
    const change = (Math.random() - 0.5) * this.volatility * this.currentPrice
    this.currentPrice += change

    return {
      price: this.currentPrice,
      timestamp: Date.now()
    }
  }

  getCurrentPrice(): number {
    return this.currentPrice
  }
}