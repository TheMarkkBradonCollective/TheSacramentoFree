import { listingTitle } from './config.mjs';
import {
  browseAppShell,
  closeListingDetail,
  confirmPendingClaim,
  markTradeCompleted,
  messageListingPoster,
  openChatForListing,
  openListingByTitle,
  openTab,
  postListing,
  screenshot,
  signIn,
  signOut,
  submitClaimHandoff,
  wait,
} from './browser.mjs';

export async function runGiveawayFlow(ctx) {
  const { page, config, outDir, platform, poster, neighbor, runId } = ctx;
  const title = listingTitle('Giveaway lamp', runId);

  await postListing(page, {
    type: 'giveaway',
    title,
    details: 'Field test giveaway listing with a working lamp for pickup.',
    category: 'Furniture',
  });
  await openTab(page, 'feed');
  await wait(1200);
  await openListingByTitle(page, title);
  await screenshot(page, outDir, '20-giveaway-posted', platform);
  await closeListingDetail(page);

  return { title };
}

export async function runGiveawayClaimFlow(ctx, title) {
  const { page, config, outDir, platform } = ctx;

  await openTab(page, 'feed');
  await wait(1000);
  await openListingByTitle(page, title);
  await screenshot(page, outDir, '21-giveaway-detail-neighbor', platform);
  await messageListingPoster(page);
  await screenshot(page, outDir, '22-giveaway-chat-open', platform);
  await submitClaimHandoff(page, 'pickup');
  await screenshot(page, outDir, '23-giveaway-handoff-submitted', platform);
}

export async function runGiveawayConfirmFlow(ctx, title) {
  const { page, outDir, platform } = ctx;

  await openChatForListing(page, title);
  await confirmPendingClaim(page, 'pickup');
  await screenshot(page, outDir, '24-giveaway-confirmed', platform);
}

export async function runLookingFlow(ctx) {
  const { page, outDir, platform, runId } = ctx;
  const title = listingTitle('Looking for moving boxes', runId);

  await postListing(page, {
    type: 'looking',
    title,
    details: 'Field test ISO request for medium moving boxes.',
    isoCategory: 'Household Needed',
  });
  await openTab(page, 'feed');
  await wait(1200);
  await openListingByTitle(page, title);
  await screenshot(page, outDir, '30-looking-posted', platform);
  await closeListingDetail(page);

  return { title };
}

export async function runLookingFulfillFlow(ctx, title) {
  const { page, outDir, platform } = ctx;

  await openTab(page, 'feed');
  await openListingByTitle(page, title);
  await screenshot(page, outDir, '31-looking-detail-helper', platform);
  await messageListingPoster(page);
  await screenshot(page, outDir, '32-looking-chat-open', platform);
  await submitClaimHandoff(page, 'dropoff');
  await screenshot(page, outDir, '33-looking-dropoff-submitted', platform);
}

export async function runLookingConfirmFlow(ctx, title) {
  const { page, outDir, platform } = ctx;

  await openChatForListing(page, title);
  await confirmPendingClaim(page, 'dropoff');
  await screenshot(page, outDir, '34-looking-confirmed', platform);
}

export async function runTradeFlow(ctx) {
  const { page, outDir, platform, runId } = ctx;
  const title = listingTitle('Trade board games', runId);

  await postListing(page, {
    type: 'trade',
    title,
    details: 'Field test trade listing offering two board games.',
    category: 'Toys & Games',
    tradeSeeking: 'Puzzle or craft supplies',
  });
  await openTab(page, 'feed');
  await wait(1200);
  await openListingByTitle(page, title);
  await screenshot(page, outDir, '40-trade-posted', platform);
  await closeListingDetail(page);

  return { title };
}

export async function runTradePartnerFlow(ctx, title) {
  const { page, outDir, platform } = ctx;

  await openTab(page, 'feed');
  await openListingByTitle(page, title);
  await screenshot(page, outDir, '41-trade-detail-partner', platform);
  await messageListingPoster(page);
  await screenshot(page, outDir, '42-trade-chat-open', platform);
}

export async function runTradeCompleteFlow(ctx, title) {
  const { page, outDir, platform } = ctx;

  await openChatForListing(page, title);
  await markTradeCompleted(page);
  await screenshot(page, outDir, '43-trade-completed', platform);
}

export async function runPosterSession(ctx) {
  const { page, config, outDir, platform, poster, runId, report } = ctx;

  await report.record('poster-sign-in', async () => {
    await signIn(page, config, poster, outDir, platform);
  });

  await report.record('poster-browse-shell', async () => {
    await browseAppShell(page, outDir, platform);
  });

  const giveaway = await report.record('poster-post-giveaway', async () => runGiveawayFlow(ctx));
  const trade = await report.record('poster-post-trade', async () => runTradeFlow(ctx));

  return { giveawayTitle: giveaway.title, tradeTitle: trade.title };
}

export async function runNeighborSession(ctx, titles) {
  const { page, config, outDir, platform, neighbor, runId, report } = ctx;

  await report.record('neighbor-sign-in', async () => {
    await signIn(page, config, neighbor, outDir, platform);
  });

  await report.record('neighbor-claim-giveaway', async () => {
    await runGiveawayClaimFlow(ctx, titles.giveawayTitle);
  });

  const looking = await report.record('neighbor-post-looking', async () => runLookingFlow(ctx));

  await report.record('neighbor-respond-trade', async () => {
    await runTradePartnerFlow(ctx, titles.tradeTitle);
  });

  return { lookingTitle: looking.title };
}

export async function runPosterConfirmSession(ctx, titles) {
  const { report } = ctx;

  await report.record('poster-confirm-giveaway', async () => {
    await runGiveawayConfirmFlow(ctx, titles.giveawayTitle);
  });

  await report.record('poster-fulfill-looking', async () => {
    await runLookingFulfillFlow(ctx, titles.lookingTitle);
  });

  await report.record('poster-complete-trade', async () => {
    await runTradeCompleteFlow(ctx, titles.tradeTitle);
  });
}

export async function runNeighborConfirmSession(ctx, titles) {
  const { report } = ctx;

  await report.record('neighbor-confirm-looking', async () => {
    await runLookingConfirmFlow(ctx, titles.lookingTitle);
  });
}

export async function runSequentialApkFlow(ctx) {
  const { page, config, outDir, platform, poster, neighbor, runId, report } = ctx;

  await report.record('apk-poster-sign-in', async () => {
    await signIn(page, config, poster, outDir, platform);
  });

  const giveaway = await report.record('apk-poster-post-giveaway', async () => runGiveawayFlow(ctx));
  const trade = await report.record('apk-poster-post-trade', async () => runTradeFlow(ctx));

  await report.record('apk-poster-browse-shell', async () => {
    await browseAppShell(page, outDir, platform);
  });

  await report.record('apk-poster-sign-out', async () => {
    await signOut(page);
  });

  await report.record('apk-neighbor-sign-in', async () => {
    await signIn(page, config, neighbor, outDir, platform);
  });

  await report.record('apk-neighbor-claim-giveaway', async () => {
    await runGiveawayClaimFlow(ctx, giveaway.title);
  });

  const looking = await report.record('apk-neighbor-post-looking', async () => runLookingFlow(ctx));

  await report.record('apk-neighbor-respond-trade', async () => {
    await runTradePartnerFlow(ctx, trade.title);
  });

  await report.record('apk-neighbor-sign-out', async () => {
    await signOut(page);
  });

  await report.record('apk-poster-sign-in-again', async () => {
    await signIn(page, config, poster, outDir, platform);
  });

  await report.record('apk-poster-confirm-giveaway', async () => {
    await runGiveawayConfirmFlow(ctx, giveaway.title);
  });

  await report.record('apk-poster-fulfill-looking', async () => {
    await runLookingFulfillFlow(ctx, looking.title);
  });

  await report.record('apk-poster-complete-trade', async () => {
    await runTradeCompleteFlow(ctx, trade.title);
  });

  await report.record('apk-poster-sign-out-final', async () => {
    await signOut(page);
  });

  await report.record('apk-neighbor-sign-in-final', async () => {
    await signIn(page, config, neighbor, outDir, platform);
  });

  await report.record('apk-neighbor-confirm-looking', async () => {
    await runLookingConfirmFlow(ctx, looking.title);
  });
}
