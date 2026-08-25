import { PLAY_STORE_ASSETS_BASE_PATH } from './playStoreAssets';

export function appScreenshotSrc(fileName: string): string {
  return `${PLAY_STORE_ASSETS_BASE_PATH}/${fileName}`;
}

export type AppTourShot = {
  file: string;
  title: string;
  body: string;
};

/** What the website already does — same community, no install required. */
export const WEBSITE_TOUR_SHOTS: AppTourShot[] = [
  {
    file: '01-home.png',
    title: 'Home',
    body: 'Open the site. See what’s being given away today — no install.',
  },
  {
    file: '02-feed.png',
    title: 'Feed',
    body: 'Scroll neighbor posts and check-ins. Same feed in the app.',
  },
  {
    file: '03-stuff.png',
    title: 'Stuff',
    body: 'Giveaways, looking-for, trades, curb alerts. Post or claim from here.',
  },
  {
    file: '04-listing.png',
    title: 'A listing',
    body: 'Photos, pickup notes, then message the poster to arrange a porch pickup.',
  },
  {
    file: '05-map.png',
    title: 'Map',
    body: 'See nearby giveaways around Sacramento neighborhoods.',
  },
  {
    file: '06-events.png',
    title: 'Events',
    body: 'Free local events — browse on the site or the app.',
  },
  {
    file: '07-event.png',
    title: 'Event detail',
    body: 'When, where, and who’s hosting. RSVP without leaving the browser.',
  },
  {
    file: '08-messages.png',
    title: 'Messages',
    body: 'Chat to set a time and porch notes — the website way to pick something up.',
  },
];

/**
 * Android app only. Walks a neighbor through a live Go Get —
 * Uber-style lock screens for the person heading over and the person waiting.
 */
export const GOGET_TOUR_STEPS: AppTourShot[] = [
  {
    file: '09-goget-listing.png',
    title: '1. Tap Go Get on a listing',
    body: 'In the Android app, a Stuff listing has Go Get — not just “message me.” That starts a live pickup instead of a text thread. On the website this button is not there; you message the neighbor and set a time yourselves.',
  },
  {
    file: '10-goget-chat.png',
    title: '2. Or start from chat',
    body: 'If you are already talking, you can start the same pickup from the thread. The app opens the pairing and keeps you on the trip until it is done.',
  },
  {
    file: '11-goget-ring.png',
    title: '3. Their phone rings on a map',
    body: 'The poster is locked onto an incoming request — like an Uber driver getting a ride. A timer counts down. They tap “available now” or offer a later window. There is no casual dismiss; this is the handshake.',
  },
  {
    file: '12-goget-waiting.png',
    title: '4. You wait on a locked map',
    body: 'While their phone rings, you stay on a full-screen map of the pickup pin. You can message or cancel. You are not dropped back into the feed to miss the answer.',
  },
  {
    file: '13-goget-navigation.png',
    title: '5. You drive like an Uber driver',
    body: 'When they say yes, the app locks you into turn-by-turn to the porch. Voice guidance, lane hints, Message, and Cancel live on that screen. Your live location is shared with them until pickup ends.',
  },
  {
    file: '14-goget-tracking.png',
    title: '6. They watch you like an Uber rider',
    body: 'The poster sees you coming on a live map: ETA, distance, your heading, Message, Cancel. This is the part the website cannot do — and the reason the app exists.',
  },
  {
    file: '15-goget-meeting.png',
    title: '7. You both see the meetup',
    body: 'Pickup pin, you, and the neighbor (if they share location) stay on one map so nobody is hunting for a house number in the dark.',
  },
  {
    file: '16-goget-arrived.png',
    title: '8. Confirm the handoff',
    body: 'When you arrive, they confirm the chair (or whatever it is) actually changed hands — or tap “Something’s wrong.” The trip stays locked until that happens. Then you are both free again.',
  },
];
