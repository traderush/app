export type Timestamp = number; // milliseconds since epoch
export type Duration = number; // milliseconds
export type Decimal = number;

export type OrderId = string;
export type PositionId = string;
export type OrderbookId = string;
export type ProductTypeId = string;
export type AccountId = string;
export type EventId = string;

export interface TimeWindow {
  start: Timestamp;
  end: Timestamp;
}

export interface PriceWindow {
  min: number;
  max: number;
}

export interface OrdersBounds {
  pricePlusBound: number;
  priceMinusBound: number;
  timeBuffer: number;
  timeLimit: number;
}

export enum Timeframe {
  TF_500MS = 500,
  TF_1S = 1000,
  TF_2S = 2000,
  TF_5S = 5000,
  TF_10S = 10000,
};


export enum Asset {
  BTC = 'BTC',
  USD = 'USD'
}
