import { ClearingHouseCommandType, type ClearingHouseApp } from "../app/clearing-house-app";
import type { MarketMaker, MarketMakerOrderbook, MarketMakerOrderbookTemplate } from "../market-maker";
import { MARKET_MAKER_BALANCE, MARKET_MAKER_ID } from "../market-maker";
import {
  Asset,
  Timeframe,
  type OrderbookId,
  type Timestamp,
} from "../domain/primitives";
import {
  IronCondorProduct,
  IRON_CONDOR_PRODUCT_ID,
} from "../core/products/iron-condor";
import type { ProductRuntime } from "../core/products/types";

const SUPPORTED_TIMEFRAMES: Timeframe[] = [
  Timeframe.TF_500MS,
  Timeframe.TF_1S,
  Timeframe.TF_2S,
  Timeframe.TF_5S,
  Timeframe.TF_10S,
];

const BASE_TEMPLATE_CONFIG = {
  productTypeId: IRON_CONDOR_PRODUCT_ID,
  priceStep: 1,
  placeOrdersBounds: { pricePlusBound: 10, priceMinusBound: 10, timeBuffer: 0, timeLimit: 20_000 },
  updateOrdersBounds: { pricePlusBound: 10, priceMinusBound: 10, timeBuffer: 0, timeLimit: 20_000 },
  cancelOrdersBounds: { pricePlusBound: 15, priceMinusBound: 15, timeBuffer: 0, timeLimit: 10_000 },
  symbol: Asset.BTC,
} as const;

export const DEFAULT_ORDERBOOK_TEMPLATES: MarketMakerOrderbookTemplate[] = SUPPORTED_TIMEFRAMES.map(
  (timeframe) => ({
    ...BASE_TEMPLATE_CONFIG,
    timeframe,
  }),
);

export const INITIAL_PRICE_SEEDS: Array<{ asset: Asset; price: number }> = [
  { asset: Asset.BTC, price: 100 },
];

export async function bootstrapDefaultMarket(
  app: ClearingHouseApp,
  marketMaker: MarketMaker,
  referenceTime: Timestamp,
): Promise<void> {
  const runtimeProduct = IronCondorProduct as unknown as ProductRuntime<Record<string, unknown>, Record<string, unknown>>;
  await app.dispatchCommand({
    type: ClearingHouseCommandType.RegisterProduct,
    product: runtimeProduct,
  });

  for (const { asset, price } of INITIAL_PRICE_SEEDS) {
    app.handlePriceAndTimeUpdate(asset, price, referenceTime);
  }

  const createdOrderbooks: MarketMakerOrderbook[] = [];
  for (const template of DEFAULT_ORDERBOOK_TEMPLATES) {
    const orderbookId = await app.dispatchCommand({
      type: ClearingHouseCommandType.CreateOrderbook,
      input: { ...template },
    }) as OrderbookId;
    createdOrderbooks.push({ id: orderbookId, template });
  }

  for (const { id: orderbookId } of createdOrderbooks) {
    await app.dispatchCommand({
      type: ClearingHouseCommandType.WhitelistMaker,
      orderbookId,
      makerId: MARKET_MAKER_ID,
    });
  }

  await app.dispatchCommand({
    type: ClearingHouseCommandType.CreditAccount,
    accountId: MARKET_MAKER_ID,
    asset: Asset.USD,
    amount: MARKET_MAKER_BALANCE,
  });

  marketMaker.setOrderbooks(createdOrderbooks);

  for (const { asset, price } of INITIAL_PRICE_SEEDS) {
    await marketMaker.handleMarketUpdate(asset, price, referenceTime);
  }
}
