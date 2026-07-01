/** Community logo (public/Logo.jpeg). */
export const APP_LOGO_SRC = '/Logo.jpeg';
export const PUSH_ICON_SRC = '/Logo.jpeg';
export const PUSH_BADGE_SRC = '/Logo.jpeg';

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
    examples: ['OFFER: Couch in Midtown', 'ISO: Looking for baby clothes', 'TRADE: Books for board games', 'CURB ALERT: Free desk outside']
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
  allowed: [
    'Free items',
    'Community help',
    'Requests for needed items',
    'Rehoming usable goods',
    'Free item-for-item trades (no money)',
  ],
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
  /** Fallback until the director profile loads from the database. */
  name: 'Markk White',
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
  closing: 'Reach out anytime through Chat → Support — we are listening.',
} as const;

export const IN_APP = {
  brandSubtitle: 'Neighbors helping neighbors',
  feedTabLabel: 'Stuff',
  feedTitle: 'Community Stuff',
  feedDescription: 'Give away items, request what you need, trade with neighbors, and connect across Sacramento — 100% free.',
  mapTitle: 'Sacramento Neighborhood Map',
  mapDescription: 'Explore free gifts and requests across Sacramento. Message neighbors to arrange porch pickup.',
  eventsTitle: 'Free Community Events',
  eventsDescription:
    'Neighborhood potlucks, swaps, and meetups — always 100% free. Unlocks for everyone when we reach 1,000 neighbors.',
  eventsTabLabel: 'Events',
  postEventButton: 'Post Event',
  chatsTitle: 'Chat',
  chatsDescription:
    'Group chats, reviews, support, and direct messages — coordinate pickups and get help from staff.',
  profileTitle: 'Your Community Profile',
  accountTabLabel: 'Account',
  onboardingTitle: 'Join Sacramento Buy Nothing',
  onboardingBody:
    'Set up your profile to give away items, request what you need, and connect with neighbors — completely free.',
  postButton: 'Create a Post',
  shareOrRequest: 'Share or Request'
} as const;

export const PRIVACY = {
  title: 'Privacy & data',
  shortTitle: 'Privacy policy',
  lastUpdated: 'June 2025',
  summary:
    'Sacramento Buy Nothing is run by Markeith White. I do not sell your information. Your account data is stored by Supabase — not on this website’s own servers.',
  sections: [
    {
      heading: 'Who runs this app',
      body:
        'Sacramento Buy Nothing is built and operated by Markeith White alone to help neighbors give freely and connect locally. This is not a commercial marketplace — there are no ads, no paywalls, and I do not sell your personal information.',
    },
    {
      heading: 'Where your data is stored',
      body:
        'I do not host the database on my own servers. Your profile, listings, messages, events, reviews, and sign-in credentials are stored in a Supabase-hosted PostgreSQL database (Supabase Inc.). Supabase provides authentication, data storage, file storage for photos, and live updates. The website you see is hosted separately (Vercel), but your community data lives in Supabase’s secure infrastructure.',
    },
    {
      heading: 'What the app collects',
      bullets: [
        'Account info: email, display name, neighborhood, bio, and profile photo you choose to upload.',
        'Community content: posts, comments, messages, events, reviews, and reports you submit.',
        'Optional location: approximate or exact pickup coordinates only when you choose to share them on a listing.',
        'Device preferences: theme choice, saved items, and notification settings stored on your device or in your account.',
        'Push notification tokens: only if you turn on alerts, so the app can send community notifications you asked for.',
      ],
    },
    {
      heading: 'What I do not do',
      bullets: [
        'I do not sell, rent, or trade your personal information.',
        'I do not run ads or track you across other websites.',
        'I do not share your data with marketers.',
        'Community staff may access reports and account data only when needed for safety, moderation, or support.',
      ],
    },
    {
      heading: 'Keeping you safe',
      bullets: [
        'You can block neighbors and report unsafe behavior to staff.',
        'Listings can hide your exact address until you choose to show it.',
        'Suspended or banned accounts cannot use the app until staff review is complete.',
        'You can delete your account at any time from Account settings — this removes your profile and community content.',
      ],
    },
    {
      heading: 'Third-party services',
      body:
        'Besides Supabase (data & auth), the app uses Vercel (website hosting) and optional web-push services for notifications you enable. Each provider processes data only to run the service. See Supabase’s privacy policy at supabase.com/privacy for how they handle infrastructure data.',
    },
    {
      heading: 'Your choices',
      bullets: [
        'Update your profile anytime in Account settings.',
        'Turn push notifications on or off in the bell menu.',
        'Delete your account permanently from Account → Delete account.',
        'Contact staff through Chat → Support with any privacy question.',
      ],
    },
  ],
  acceptLabel: 'I have read and understand this privacy policy',
  acceptButton: 'Accept & continue',
  viewAgainNote: 'You can read this policy anytime from the home page or your Account tab.',
} as const;

export const TERMS = {
  title: 'Terms of use',
  shortTitle: 'Terms & user agreement',
  lastUpdated: 'June 2025',
  summary:
    'By using Sacramento Buy Nothing, you agree to these terms. The app is run by Markeith White for local, free neighbor-to-neighbor gifting only — no selling, no flipping, no harassment.',
  sections: [
    {
      heading: 'Agreement',
      body:
        'These Terms of Use are a binding agreement between you and Markeith White, the sole operator of Sacramento Buy Nothing. By creating an account, signing in, or using the app, you agree to follow these terms, our community rules, and our Privacy & data policy.',
    },
    {
      heading: 'What this app is for',
      bullets: [
        'Giving away items for free to neighbors in the Sacramento area.',
        'Requesting items you need, with no money involved.',
        'Free item-for-item trades when both neighbors agree — still no cash.',
        'Coordinating porch pickup, meetups, and community events.',
      ],
    },
    {
      heading: 'What you may not do',
      bullets: [
        'Sell items, run auctions, or ask for money in any form.',
        'Flip or resell items received through this community for profit.',
        'Harass, threaten, scam, or mislead other neighbors.',
        'Post illegal, stolen, dangerous, or inappropriate content.',
        'Impersonate another person or create accounts to evade a ban.',
        'Scrape, spam, or attempt to break or overload the app.',
      ],
    },
    {
      heading: 'Your account',
      bullets: [
        'You are responsible for your account credentials and activity under your account.',
        'Profile information you provide must be honest and appropriate for a local community.',
        'You must be old enough to enter a binding agreement in your jurisdiction, or have a parent or guardian’s permission.',
        'I may suspend or permanently disable accounts that break these terms or harm the community.',
      ],
    },
    {
      heading: 'Your content',
      body:
        'You keep ownership of photos and text you post, but you grant Sacramento Buy Nothing permission to display, store, and share that content within the app so neighbors can use the service — for example, showing your listing, messages, and profile to other members. You must only post content you have the right to share.',
    },
    {
      heading: 'Safety & moderation',
      bullets: [
        'Meet neighbors in safe, public, or well-lit places when possible. Porch pickup is common, but use your judgment.',
        'Report unsafe behavior, scams, or rule-breaking through the in-app report tools or Chat → Support.',
        'Community staff may review reports, remove content, and restrict accounts to keep neighbors safe.',
        'I am not responsible for disputes between neighbors, item condition, no-shows, or offline interactions.',
      ],
    },
    {
      heading: 'Service availability',
      body:
        'The app is provided as-is. I work to keep it online and safe, but I do not guarantee uninterrupted access, error-free operation, or that every listing or message will remain available. Features may change as the community grows.',
    },
    {
      heading: 'Limitation of liability',
      body:
        'To the fullest extent allowed by law, Markeith White and Sacramento Buy Nothing are not liable for indirect, incidental, or consequential damages arising from your use of the app, offline exchanges, or third-party services (including Supabase and Vercel). Your use of the app is at your own risk.',
    },
    {
      heading: 'Changes',
      body:
        'I may update these terms as the app evolves. When terms change materially, you may be asked to review and accept the updated agreement when you sign in. Continued use after changes means you accept the updated terms.',
    },
    {
      heading: 'Contact',
      body:
        'Questions about these terms? Reach out through Chat → Support in the app. For privacy questions, see the Privacy & data policy.',
    },
  ],
  acceptLabel: 'I have read and agree to the terms of use',
  acceptButton: 'Accept & continue',
  viewAgainNote: 'You can read these terms anytime from the home page or your Account tab.',
} as const;

export const AWARDS = {
  panelTitle: 'Neighbor Awards',
  panelSubtitle: 'Fun badges for generous neighbors — unlock at 500 members!',
  panelIntro:
    'Celebrate the free gifts, fulfilled requests, trades, and neighborly moments you have built over time.',
  unlockBadge: 'Almost party time',
  unlockTitle: 'Let\'s unlock awards together!',
  unlockBody:
    'We need 500 neighbors before the badge party starts. Copy your invite link and share it with friends, family, and folks in your neighborhood — every new neighbor helps!',
  unlockNote:
    'Early joiners (the first 100, 200, 300, 400, and 500 members) get special founding badges. Lots more badges unlock automatically as you give, claim, chat, and show up for the community.',
  shareButton: 'Copy link & spread the word',
  shareTitle: 'Join Sacramento Buy Nothing',
  shareMessage:
    'Come join our free Sacramento Buy Nothing group — give, receive, and trade with neighbors. No money, just kindness: {url}',
  unlockedIntro:
    'Little badges for neighbors who give, help, show up, and make this community feel like home.',
  noAwardsYet: 'Your badge shelf is waiting!',
  noAwardsHint: 'Give an item, claim something, RSVP to an event, or say hi in community chat — badges show up as you participate.',
  leaderboardTitle: 'Top neighbors',
  leaderboardSubtitle: 'Neighbors ranked by badges earned — give, help, and show up to climb the board.',
  leaderboardLoading: 'Loading the leaderboard…',
  leaderboardEmptyTitle: 'No leaderboard yet',
  leaderboardEmptyHint: 'As neighbors earn badges, the most decorated profiles will show up here.',
  profileSectionTitle: 'Your awards',
  profileSectionBody: 'See badges you have earned and scroll back through your community history.',
  profileOpenButton: 'Go back in time',
  timelineTitle: 'Go back in time',
  timelineIntro:
    'Your neighborhood story, newest first — giveaways completed, gifts received, requests fulfilled, and trades.',
  timelineEmpty:
    'No history yet. Give, request, trade, or help a neighbor — your timeline will grow from here.',
  previewBullets: [
    'Founding neighbor badges for the first 100, 200, 300, 400, and 500 members',
    'Auto badges when you give gifts, claim items, and fulfill requests',
    'Shout-outs for events, chat, upvotes, and being an awesome neighbor',
    'Special staff picks for neighbors who go above and beyond',
  ],
  comingSoonTitle: 'Awards are on the way',
  comingSoonBody:
    'I am building a way to celebrate neighbors who give, help, trade fairly, and keep the community strong — with no money involved.',
  comingSoonBullets: [
    'Donation and giving streak badges',
    'Milestones for items shared and requests fulfilled',
    'Recognition for kind, reliable neighbors',
  ],
  comingSoonNote:
    'Awards are about community spirit only — never payments or donations.',
} as const;

export const EVENTS = {
  unlockBadge: 'Almost meetup time',
  unlockTitle: 'Let\'s unlock community events!',
  unlockBody:
    'We need 1,000 neighbors before the Events tab goes live. Copy your invite link and share it — every new neighbor gets us closer to potlucks, swaps, and park meetups!',
  unlockNote:
    'Events are always 100% free — no tickets, no fees. Once we hit 1,000 members, you can post and RSVP to neighborhood gatherings.',
  shareButton: 'Copy link & spread the word',
  shareTitle: 'Join Sacramento Buy Nothing',
  shareMessage:
    'Come join our free Sacramento Buy Nothing group — give, receive, trade, and meet neighbors. No money, just kindness: {url}',
  unlockedIntro:
    'Post and discover free neighborhood gatherings — potlucks, swaps, meetups, and more.',
  previewBullets: [
    'Free potlucks, clothing swaps, and park meetups',
    'RSVP so hosts know who\'s coming',
    'Comments and updates on each gathering',
    'Always free — no tickets or fees allowed',
  ],
  staffPreviewNote:
    'Our team may post gatherings early — browse below. RSVP and posting open for everyone once we hit 1,000 neighbors.',
} as const;
