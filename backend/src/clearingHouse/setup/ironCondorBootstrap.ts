import { ClearingHouseAPI } from '../ClearingHouseAPI';
import { TimeFrame } from '../../config/timeframeConfig';
import {
  IRON_CONDOR_PRODUCT_ID,
  buildIronCondorOrderbookConfig,
  createIronCondorProductType,
} from '../products/ironCondor';

export const IRON_CONDOR_TIMEFRAMES: TimeFrame[] = [
  TimeFrame.HALF_SECOND,
  TimeFrame.TWO_SECONDS,
  TimeFrame.TEN_SECONDS,
];

let registered = false;

export function ensureIronCondorBootstrap(api: ClearingHouseAPI): void {
  if (registered) {
    return;
  }

  api.registerProductType(createIronCondorProductType());

  for (const timeframe of IRON_CONDOR_TIMEFRAMES) {
    api.createOrderbook(buildIronCondorOrderbookConfig(timeframe));
  }

  registered = true;
}

export function getIronCondorOrderbookIds(): string[] {
  return IRON_CONDOR_TIMEFRAMES.map(
    (timeframe) => `${IRON_CONDOR_PRODUCT_ID}:${timeframe}`
  );
}
