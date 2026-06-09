/** Local brand logo (public/Logo.jpeg) — do not hotlink external CDNs. */
export const APP_LOGO_SRC = '/Logo.jpeg';

export const SITE = {
  name: 'Sacramento Buy Nothing',
  shortName: 'Sac Buy Nothing',
  tagline: 'Sharing is better than throwing away.',
  description:
    'A community-powered platform where people in Sacramento can give away items they no longer need — completely free.',
  metaDescription:
    'Sacramento Buy Nothing — free local gifting. No selling, no bidding, no flipping. Neighbors helping neighbors across Sacramento.',
  principles: ['No selling.', 'No bidding.', 'No flipping.', 'Just neighbors helping neighbors.'],
  freeRule: 'Everything posted must be 100% free.',
  joinCta: {
    title: 'Join The Community',
    lines: [
      'Give what you can.',
      'Ask for what you need.',
      'Help keep Sacramento connected.'
    ]
  }
} as const;

export const ABOUT = {
  title: 'What Is Sacramento Buy Nothing?',
  body: 'Sacramento Buy Nothing is a local sharing community focused on reducing waste and helping people connect through generosity.',
  memberCan: [
    'Give away unwanted items',
    'Request things they need',
    'Help reduce landfill waste',
    'Support local families and neighbors',
    'Share resources without money involved'
  ]
} as const;

export const COMMON_ITEMS = [
  'Furniture',
  'Clothes & shoes',
  'Electronics',
  'Kitchen supplies',
  'Baby items',
  'Books & games',
  'Plants',
  'Art supplies',
  'Moving boxes',
  'Pet supplies',
  'Random useful stuff'
] as const;

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Create a Post',
    body: "Post an item you want to give away or something you're looking for.",
    examples: ['OFFER: Couch in Midtown', 'ISO: Looking for baby clothes', 'CURB ALERT: Free desk outside']
  },
  {
    step: 2,
    title: 'Connect With Neighbors',
    body: 'Users comment or message to arrange pickup.'
  },
  {
    step: 3,
    title: 'Porch Pickup',
    body: 'Most exchanges happen through:',
    bullets: ['Porch pickup', 'Public meetup', 'Driveway pickup']
  },
  {
    step: 4,
    title: 'Keep It Free',
    body: 'No payments allowed. This community is built on generosity and mutual aid.'
  }
] as const;

export const RULES = {
  allowed: ['Free items', 'Community help', 'Requests for needed items', 'Rehoming usable goods'],
  notAllowed: [
    'Selling',
    'Auctions',
    'Trades for money',
    'Harassment',
    'Scams',
    'Reselling gifted items for profit'
  ],
  postReminder:
    'Everything must be 100% free. No selling, trades for money, or flipping allowed — only neighbors helping neighbors.'
} as const;

export const WHY_IT_MATTERS = {
  title: 'Why It Matters',
  intro: 'Every item reused is:',
  points: [
    'Less waste in landfills',
    'Less unnecessary spending',
    'More community support',
    'More sustainability'
  ],
  closing: 'Small acts of sharing create stronger neighborhoods.'
} as const;

export const COMMUNITY_VALUES = [
  'Trust',
  'Kindness',
  'Sustainability',
  'Mutual aid',
  'Community support'
] as const;

export const COMMUNITY_FIRST = {
  title: 'Community First',
  intro: 'Sacramento Buy Nothing is built on:',
  closing: 'Sometimes one free item can make a huge difference.'
} as const;

export const FUTURE_FEATURES = [
  'User profiles',
  'Reputation system',
  'Pickup scheduling',
  'Neighborhood filtering',
  'Item categories',
  'Mobile app support',
  'Donation streak badges',
  'Local alerts'
] as const;

export type AppUpdate = {
  date: string;
  title: string;
  /** Short summary on the updates list */
  body: string;
  /** Full story when a neighbor taps “Read more” */
  detail?: string;
};

export function appUpdateId(update: Pick<AppUpdate, 'date' | 'title'>): string {
  const slug = update.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${update.date}_${slug}`;
}

/** Newest first — plain-language changelog for neighbors. */
export const APP_UPDATES: AppUpdate[] = [
  {
    date: '2026-06-09',
    title: 'Each staff member writes their own message',
    body: 'Team notes are personal now — every staff member publishes their own welcome message on home and reviews.',
    detail:
      'Instead of one shared city manager note, each moderator, administrator, and city manager can write and save their own message from Help & support. Published messages appear in the home carousel and on the reviews page. The director still has a separate director note.',
  },
  {
    date: '2026-06-09',
    title: 'Vote on updates, reviews & team notes',
    body: 'Upvote or downvote changelog entries, neighbor reviews, and staff messages. Update votes go to your director.',
    detail:
      'Tap an update to read the full story, then weigh in with an up or down vote. Reviews and messages from the director or any staff member can be voted on too. Sign in to vote — you cannot vote on your own review.',
  },
  {
    date: '2026-06-09',
    title: 'GoFundMe footer improvements',
    body: 'Removed from the map tab. Tap the footer elsewhere for the full breakdown.',
    detail:
      'The compact GoFundMe strip no longer sits under the map. On every other scrollable page it appears at the very bottom. Tap it to open the full cost page — or a full-screen panel when you are signed in.',
  },
  {
    date: '2026-06-09',
    title: 'Push notifications',
    body: 'Optional alerts for messages, claims, and community activity. Turn them on or off in your account settings.',
  },
  {
    date: '2026-06-09',
    title: 'GoFundMe on its own page',
    body: 'Full cost breakdown lives on a dedicated page. Every other screen has a short support link at the bottom.',
  },
  {
    date: '2026-06-09',
    title: 'Updates & Reviews pages',
    body: 'Changelog and neighbor reviews — both in the menu under Community.',
    detail:
      'The Updates page lists everything we have shipped, oldest to newest. Reviews let neighbors rate the app and read a note from the director. Upvotes and downvotes on updates go straight to your director as feedback.',
  },
  {
    date: '2026-06-09',
    title: 'Cleaner feed filters',
    body: 'Filters and sorting now live in one “Filters & sort” panel so the feed stays easy to scroll.',
  },
  {
    date: '2026-06-09',
    title: 'Smarter quick picks',
    body: 'Tap multiple quick filters at once — Trending, Saved, My area, With photos, and Needs pickup.',
  },
  {
    date: '2026-06-09',
    title: 'More ways to browse the feed',
    body: 'Filter by giving vs. looking for, category, neighborhood, status, votes, and comments. Sort by newest, oldest, or most active.',
  },
  {
    date: '2026-06-09',
    title: 'Withdrawn posts stay hidden',
    body: 'If someone removes a listing, it no longer clutters the community feed.',
  },
  {
    date: '2026-06-09',
    title: 'Free community events',
    body: 'Post neighborhood gatherings, RSVP (going / maybe / can’t go), and leave comments. Every event must be 100% free.',
  },
  {
    date: '2026-06-09',
    title: 'A note from your director',
    body: 'Markeith White shares why the app exists — free forever, no ads, and your info is never sold.',
  },
  {
    date: '2026-06-09',
    title: 'Star reviews',
    body: 'Leave a quick rating for the app. One review per person, updated anytime.',
  },
  {
    date: '2026-06-09',
    title: 'Support the app (optional)',
    body: 'A GoFundMe link explains what it costs to run Sacramento Buy Nothing — and why we will never charge you or show ads.',
  },
  {
    date: '2026-06-07',
    title: 'Save listings & Labor section',
    body: 'Bookmark posts to check later. New Labor section for community help and skills. Added Old Foothill Farms to the area list.',
  },
  {
    date: '2026-06-07',
    title: 'Smoother mobile home page',
    body: 'Fixed layout quirks on phones so browsing before you sign in feels better.',
  },
  {
    date: '2026-06-02',
    title: 'Preview listings before joining',
    body: 'Guests can browse real community posts on the home page without signing in first.',
  },
  {
    date: '2026-06-02',
    title: 'Animated public home page',
    body: 'Scroll-driven motion on the welcome page so the site feels alive before you sign in.',
  },
  {
    date: '2026-06-02',
    title: 'Tap photos to enlarge',
    body: 'Listing images open in a lightbox so you can see details before you message someone.',
  },
  {
    date: '2026-06-02',
    title: 'Delete your account',
    body: 'You can remove your account and data when you no longer want to participate.',
  },
  {
    date: '2026-06-02',
    title: 'Staff safety tools',
    body: 'Leaders can remove comments, delete accounts, and fully purge data when needed.',
  },
  {
    date: '2026-05-31',
    title: 'Clearer claim & hold buttons',
    body: 'Easier to see when something is available, on hold, or already claimed.',
  },
  {
    date: '2026-05-29',
    title: 'Help & support tab',
    body: 'Report problems, open support tickets, and reach staff from one dedicated place in the app.',
  },
  {
    date: '2026-05-29',
    title: 'Support tickets with photos',
    body: 'Attach pictures when you report an issue so staff can help faster.',
  },
  {
    date: '2026-05-29',
    title: 'Pick up several items at once',
    body: 'Claim multiple listings in one trip when a neighbor is giving away more than one thing.',
  },
  {
    date: '2026-05-29',
    title: 'Block & report',
    body: 'Block someone who makes you uncomfortable and report serious issues to staff.',
  },
  {
    date: '2026-05-29',
    title: 'Staff moderation tools',
    body: 'Community leaders can review reports, manage accounts, and keep the space safe.',
  },
  {
    date: '2026-05-29',
    title: 'Team directory',
    body: 'See who helps run the community and what role they play.',
  },
  {
    date: '2026-05-29',
    title: 'Neighbor profiles & avatars',
    body: 'View profiles from the directory and see neighbor photos at a glance.',
  },
  {
    date: '2026-05-29',
    title: 'Message requests',
    body: 'New chats start as a request so you can accept or decline before talking.',
  },
  {
    date: '2026-05-29',
    title: '38 Sacramento neighborhoods',
    body: 'Pick your area from a fuller list that covers more of the region.',
  },
  {
    date: '2026-05-29',
    title: 'Steadier sign-in & listings',
    body: 'Stay signed in after refreshing, and posts load reliably once you are logged in.',
  },
  {
    date: '2026-05-29',
    title: 'Pinned mobile header & nav',
    body: 'The top bar and bottom tabs stay put while you scroll so the app feels stable on phones.',
  },
  {
    date: '2026-05-29',
    title: 'Live updates everywhere',
    body: 'New posts, chats, votes, and ticket replies appear without refreshing the page.',
  },
  {
    date: '2026-05-29',
    title: 'Faster photos',
    body: 'Images load quicker and upload more smoothly when you post listings.',
  },
  {
    date: '2026-05-29',
    title: 'Listing detail page',
    body: 'Tap any post for the full story — photos, comments, interest votes, and claim options.',
  },
  {
    date: '2026-05-29',
    title: 'Share pickup location in chat',
    body: 'Send your porch or meetup spot privately when arranging a pickup.',
  },
  {
    date: '2026-05-29',
    title: 'Real driving routes on the map',
    body: 'Directions to free gifts use real streets instead of straight lines.',
  },
  {
    date: '2026-05-29',
    title: 'Edit your own posts',
    body: 'Update a listing anytime if details change before it is claimed.',
  },
  {
    date: '2026-05-29',
    title: 'Community stats bar',
    body: 'See live counts of neighbors, posts, and gifts at the top of the feed.',
  },
  {
    date: '2026-05-29',
    title: 'Community stats on public home',
    body: 'The welcome page shows how active the community is before you join.',
  },
  {
    date: '2026-05-29',
    title: 'Role badges',
    body: 'Director and staff roles show on profiles so you know who helps run things.',
  },
  {
    date: '2026-05-29',
    title: 'Director role management',
    body: 'The director can assign staff roles from neighbor profiles.',
  },
  {
    date: '2026-05-29',
    title: 'Public welcome site',
    body: 'About, How It Works, Rules, Areas, and Community pages for guests before they sign in.',
  },
  {
    date: '2026-05-29',
    title: 'Fresh design system',
    body: 'Modern cards, cleaner navigation, better dark/light themes, and a more polished look throughout.',
  },
  {
    date: '2026-05-29',
    title: 'Map opens first',
    body: 'The neighborhood map is the default tab so you see gifts near you right away.',
  },
  {
    date: '2026-05-29',
    title: 'Post from the feed',
    body: 'A Post button on the feed view on every screen size — not just the map.',
  },
  {
    date: '2026-05-29',
    title: 'Full-screen mobile chat & profile',
    body: 'Chat and account pages use the full phone screen, matching map and feed.',
  },
  {
    date: '2026-05-29',
    title: 'Tab history & back button',
    body: 'Your phone back button moves between tabs the way you expect.',
  },
  {
    date: '2026-05-29',
    title: 'ISO fulfillment credits',
    body: 'Neighbors who give generously earn credit when they ask for something they need.',
  },
  {
    date: '2026-05-29',
    title: 'Map color index',
    body: 'A quick legend on the map explains what each pin color means.',
  },
  {
    date: '2026-05-28',
    title: 'Everything saved online',
    body: 'All posts, profiles, and messages now live in the cloud so nothing is lost between devices.',
  },
  {
    date: '2026-05-20',
    title: 'Install on your home screen',
    body: 'Add Sacramento Buy Nothing to your phone like an app — works offline for basic browsing.',
  },
  {
    date: '2026-05-20',
    title: 'Neighbor chat',
    body: 'Message the person giving something away to arrange porch pickup.',
  },
  {
    date: '2026-05-20',
    title: 'User roles',
    body: 'Early staff and director roles so the community can be moderated as it grows.',
  },
  {
    date: '2026-05-20',
    title: 'Interactive Sacramento map',
    body: 'Leaflet map with zoom controls, custom pins, and driving directions to free items.',
  },
  {
    date: '2026-05-19',
    title: 'Photos on listings',
    body: 'Upload pictures when you post so neighbors know exactly what you are giving away.',
  },
  {
    date: '2026-05-19',
    title: 'Neighborhood map & feed',
    body: 'Browse free gifts on a map or in a scrollable feed — giving and looking for items.',
  },
  {
    date: '2026-05-19',
    title: 'Sacramento neighborhood list',
    body: 'Pick your area when you join so posts stay local to your part of town.',
  },
  {
    date: '2026-05-19',
    title: 'Works on phone, tablet & desktop',
    body: 'Layouts adapt to your screen — one community app wherever you open it.',
  },
  {
    date: '2026-05-19',
    title: 'Offline-friendly',
    body: 'Basic browsing still works if your connection drops for a moment.',
  },
  {
    date: '2026-05-19',
    title: 'Orange & sage branding',
    body: 'Warm community colors and a local logo — built to feel like Sacramento, not a generic app.',
  },
  {
    date: '2026-05-19',
    title: 'Sacramento Buy Nothing launches',
    body: 'The app goes live — a free place for Sacramento neighbors to give, ask, and connect with no money involved.',
  },
  {
    date: '2026-05-20',
    title: 'Hooked up to a real database',
    body: 'Posts and accounts save online so neighbors see the same community on every visit.',
  },
  {
    date: '2026-05-20',
    title: 'Full-screen mobile layout',
    body: 'Map, feed, chat, and profile each use the whole phone screen — no cramped nested boxes.',
  },
  {
    date: '2026-05-20',
    title: 'Mobile-first, desktop unchanged',
    body: 'Reworked the phone experience while keeping the wider desktop layout neighbors already liked.',
  },
  {
    date: '2026-05-19',
    title: 'The community vision',
    body: 'Wrote down what Sacramento Buy Nothing is — free gifting, local neighbors, no selling, ever.',
  },
  {
    date: '2026-05-19',
    title: 'Where it all started',
    body: 'First session: build a web app so Sacramento neighbors can give freely and ask kindly — May 19, 2026.',
  },
];

export const SUPPORT = {
  gofundmeUrl: 'https://gofund.me/bc824e51b',
  gofundmeTitle: 'Help keep the app running',
  gofundmeBlurb:
    'Sacramento Buy Nothing is 100% free and ad-free — no paywalls, no ads, and your data is never sold. Running it still costs real money every month.',
  gofundmeCostsSummary:
    'Monthly costs include Cursor (building the app), Supabase (your data), Vercel (hosting), and GoDaddy (web address).',
  gofundmeDetail:
    'Behind the scenes, four paid services keep Sacramento Buy Nothing online. None of them are free long-term — together they are the monthly bill for a community app that will never charge neighbors or show ads.',
  costItems: [
    {
      name: 'Cursor',
      title: 'Building & updating the app',
      description:
        'Software that helps write and improve the website — new features, bug fixes, and design changes. Think of it as the workshop where the app gets built and maintained, with a monthly subscription fee.',
    },
    {
      name: 'Supabase',
      title: 'Accounts, posts & messages',
      description:
        'The online database that stores profiles, listings, chats, events, and reviews. It also powers sign-in and live updates so new posts appear without refreshing. Billed monthly based on usage.',
    },
    {
      name: 'Vercel',
      title: 'Hosting the site 24/7',
      description:
        'Puts the app on the internet so anyone can open it on a phone or computer, day or night. Like renting space on a server — paid monthly so the site stays fast and online.',
    },
    {
      name: 'GoDaddy',
      title: 'The web address (domain name)',
      description:
        'Pays for the custom link you share with neighbors (instead of a long, random technical URL). Renewed yearly so the community always has the same address.',
    },
  ] as const,
  gofundmeClosing:
    'Every dollar on GoFundMe goes toward keeping these bills paid so the app can stay free for everyone.',
  gofundmeButton: 'Support on GoFundMe',
} as const;

export const DIRECTOR_MESSAGE = {
  name: 'Markeith White',
  title: 'Buy Nothing Director',
  headline: 'A note from your director',
  goal:
    'Sacramento Buy Nothing exists so neighbors can give freely, ask kindly, and keep good things out of the landfill — with no money involved. That is the goal, plain and simple.',
  promises: [
    'This app is 100% free — always.',
    'No ads. Ever.',
    'I keep you in mind with every feature I build.',
    'I do not want your information for anything beyond making the community work, and I will never sell it.',
  ],
  closing: 'Thank you for being part of this community.',
} as const;

export const STAFF_MESSAGE_DEFAULT = {
  name: 'Sacramento Buy Nothing',
  title: 'Team member',
  headline: 'A note from our team',
  goal:
    'I help keep our Sacramento circle welcoming, fair, and focused on neighbors helping neighbors — with moderation, support, and community leadership.',
  promises: [
    'I am here when something feels off or unsafe.',
    'Reports and tickets get real attention from staff.',
    'We protect the free, local spirit of this community.',
    'Your voice matters in how we grow together.',
  ],
  closing: 'Reach out anytime through Help & support — we are listening.',
} as const;

export const IN_APP = {
  brandSubtitle: 'Neighbors helping neighbors',
  feedTitle: 'Community Gift Feed',
  feedDescription: 'Give away items, request what you need, and connect with Sacramento neighbors — 100% free.',
  mapTitle: 'Sacramento Neighborhood Map',
  mapDescription: 'Explore free gifts and requests across Sacramento. Message neighbors to arrange porch pickup.',
  eventsTitle: 'Free Community Events',
  eventsDescription:
    'Post and discover free neighborhood gatherings — potlucks, swaps, meetups, and more. No tickets or fees allowed.',
  eventsTabLabel: 'Events',
  postEventButton: 'Post Event',
  chatsTitle: 'Neighbor Messages',
  chatsDescription: 'Comment or message to arrange pickup. Keep every exchange free and friendly.',
  profileTitle: 'Your Community Profile',
  menuTitle: 'Help & support',
  menuDescription: 'Report issues, open support tickets, and get help staying safe in the community.',
  menuTabLabel: 'Help',
  accountTabLabel: 'Account',
  onboardingTitle: 'Join Sacramento Buy Nothing',
  onboardingBody:
    'Set up your profile to give away items, request what you need, and connect with neighbors — completely free.',
  postButton: 'Create a Post',
  shareOrRequest: 'Share or Request'
} as const;
