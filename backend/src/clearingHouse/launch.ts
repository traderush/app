import { ClearingHouseAPI, clearingHouseAPI } from './ClearingHouseAPI';
import { ensureIronCondorBootstrap } from './setup/ironCondorBootstrap';
import { RandomIronCondorMarketMaker } from './marketMakers/RandomIronCondorMarketMaker';

let marketMaker: RandomIronCondorMarketMaker | undefined;

export function launchClearingHouse(): ClearingHouseAPI {
  ensureIronCondorBootstrap(clearingHouseAPI);
  clearingHouseAPI.clearingHouse.startPriceFeed();

  if (!marketMaker) {
    marketMaker = new RandomIronCondorMarketMaker(clearingHouseAPI);
  }
  marketMaker.start();

  return clearingHouseAPI;
}

export function shutdownClearingHouse(): void {
  marketMaker?.stop();
  clearingHouseAPI.clearingHouse.stopPriceFeed();
}
