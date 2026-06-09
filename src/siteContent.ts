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
  body: string;
};

/** Newest first — plain-language changelog for neighbors. */
export const APP_UPDATES: AppUpdate[] = [
  {
    date: '2026-06-09',
    title: 'Reviews page & team messages',
    body: 'Swipe through reviews and notes from the director and city manager on the home page — or open Reviews for the full list.',
  },
  {
    date: '2026-06-09',
    title: 'Cleaner feed filters',
    body: 'Filters and sorting now live in one “Filters & sort” panel so the feed stays easy to scroll.',
  },
  {
    date: '2026-06-09',
    title: 'Smarter quick picks',
    body: 'Tap multiple quick filters at once — Trending, Trading, Saved, My area, With photos, and Needs pickup.',
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
    title: 'Tap photos to enlarge',
    body: 'Listing images open in a lightbox so you can see details before you message someone.',
  },
  {
    date: '2026-06-02',
    title: 'Delete your account',
    body: 'You can remove your account and data when you no longer want to participate.',
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
    title: 'Neighbor directory improvements',
    body: 'View profiles from the directory and see neighbor avatars at a glance.',
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
    title: 'Steadier sign-in',
    body: 'Stay signed in after refreshing, and listings load reliably once you are logged in.',
  },
  {
    date: '2026-05-29',
    title: 'Map & feed fixes',
    body: 'Listings show correctly on the map and feed, with pickup pins in the right spots.',
  },
  {
    date: '2026-05-29',
    title: 'Role badges',
    body: 'Director and staff roles show on profiles so you know who is helping run things.',
  },
  {
    date: '2026-05-29',
    title: 'Community stats on home',
    body: 'The public home page shows live counts of neighbors, posts, and gifts shared.',
  },
];

export const SUPPORT = {
  gofundmeUrl: 'https://gofund.me/bc824e51b',
  gofundmeTitle: 'Help keep the app running',
  gofundmeBlurb:
    'Sacramento Buy Nothing is 100% free and ad-free — no paywalls, no ads, and your data is never sold. Running it still costs real money every month.',
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

export const CITY_MANAGER_MESSAGE = {
  name: 'Sacramento Buy Nothing',
  title: 'City Manager',
  headline: 'A note from your city manager',
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
