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

export const SUPPORT = {
  gofundmeUrl: 'https://gofund.me/bc824e51b',
  gofundmeTitle: 'Help keep the app running',
  gofundmeBlurb:
    'Sacramento Buy Nothing is 100% free and ad-free — no paywalls, no ads, and your data is never sold. Running it still costs real money every month.',
  gofundmeDetail:
    'This app is built and maintained with Cursor (AI-assisted development), Supabase (database, auth, and live updates), Vercel (hosting the website), and GoDaddy (domain name). Each of those services adds to the monthly bill so neighbors can keep giving freely.',
  costItems: [
  { name: 'Cursor', role: 'Building & improving the app' },
  { name: 'Supabase', role: 'Database, sign-in, and realtime' },
  { name: 'Vercel', role: 'Hosting the site online' },
  { name: 'GoDaddy', role: 'Custom domain name' },
  ] as const,
  gofundmeClosing: 'If this community helps you, a small donation on GoFundMe helps cover these costs.',
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
