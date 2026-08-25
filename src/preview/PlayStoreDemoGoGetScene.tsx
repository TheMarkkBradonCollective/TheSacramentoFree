import { useMemo } from 'react';
import { NotificationsHubProvider } from '../contexts/NotificationsHubContext';
import { PresenceProvider } from '../contexts/PresenceContext';
import { useItemsEngagement } from '../hooks/useItemsEngagement';
import { useEventsEngagement } from '../hooks/useEventsEngagement';
import MobileView from '../components/MobileView';
import ItemDetailView from '../components/ItemDetailView';
import GoGetIncomingRingOverlay from '../components/goget/GoGetIncomingRingOverlay';
import GoGetTripLockScreen from '../components/goget/GoGetTripLockScreen';
import {
  DEMO_GOGET_ACTIVE_SESSION,
  DEMO_GOGET_ARRIVED_SESSION,
  DEMO_GOGET_AVERY_PROFILE,
  DEMO_GOGET_RING_SESSION,
  DEMO_GOGET_WAITING_SESSION,
  SACRAMENTO_LOCATIONS,
} from './playStoreDemoGoGet';
import {
  PLAY_STORE_DEMO_EVENTS,
  PLAY_STORE_DEMO_ITEMS,
  PLAY_STORE_DEMO_PROFILE,
} from './playStoreDemo';

interface PlayStoreDemoGoGetSceneProps {
  scene: string;
}

function DemoShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      id="app_root_layout"
      className={`min-h-screen flex flex-col mesh-bg text-app antialiased font-sans ${className}`}
    >
      {children}
    </div>
  );
}

export default function PlayStoreDemoGoGetScene({ scene }: PlayStoreDemoGoGetSceneProps) {
  const profile = PLAY_STORE_DEMO_PROFILE;
  const items = PLAY_STORE_DEMO_ITEMS;
  const events = PLAY_STORE_DEMO_EVENTS;
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const eventIds = useMemo(() => events.map((event) => event.id), [events]);
  const engagement = useItemsEngagement(itemIds, profile);
  const eventsEngagement = useEventsEngagement(eventIds, profile);
  const chairItem = useMemo(() => items.find((item) => item.id === 'demo-item-chair') ?? items[0], [items]);

  if (scene === 'goget-ring') {
    return (
      <DemoShell>
        <div className="flex-1 flex items-center justify-center p-4 opacity-30 pointer-events-none">
          <p className="text-sm text-muted">Incoming pickup request…</p>
        </div>
        <GoGetIncomingRingOverlay
          session={DEMO_GOGET_RING_SESSION}
          userProfile={DEMO_GOGET_AVERY_PROFILE}
          onClose={() => undefined}
          onSessionResolved={() => undefined}
        />
      </DemoShell>
    );
  }

  if (scene === 'goget-waiting') {
    return (
      <DemoShell>
        <GoGetTripLockScreen
          session={DEMO_GOGET_WAITING_SESSION}
          userProfile={profile}
          item={chairItem}
          initialOrigin={SACRAMENTO_LOCATIONS.downtown}
        />
      </DemoShell>
    );
  }

  if (scene === 'goget-navigation') {
    return (
      <DemoShell>
        <GoGetTripLockScreen
          session={DEMO_GOGET_ACTIVE_SESSION}
          userProfile={profile}
          item={chairItem}
          initialOrigin={SACRAMENTO_LOCATIONS.downtown}
        />
      </DemoShell>
    );
  }

  if (scene === 'goget-tracking') {
    return (
      <DemoShell>
        <GoGetTripLockScreen
          session={DEMO_GOGET_ACTIVE_SESSION}
          userProfile={DEMO_GOGET_AVERY_PROFILE}
          item={chairItem}
          initialOrigin={SACRAMENTO_LOCATIONS.eastSac}
        />
      </DemoShell>
    );
  }

  if (scene === 'goget-meeting') {
    return (
      <DemoShell>
        <GoGetTripLockScreen
          session={DEMO_GOGET_ACTIVE_SESSION}
          userProfile={profile}
          item={chairItem}
          initialOrigin={SACRAMENTO_LOCATIONS.downtown}
          preferOverview
        />
      </DemoShell>
    );
  }

  if (scene === 'goget-arrived') {
    return (
      <DemoShell>
        <GoGetTripLockScreen
          session={DEMO_GOGET_ARRIVED_SESSION}
          userProfile={DEMO_GOGET_AVERY_PROFILE}
          item={chairItem}
          initialOrigin={SACRAMENTO_LOCATIONS.eastSac}
        />
      </DemoShell>
    );
  }

  if (scene === 'goget-chat') {
    return (
      <DemoShell>
        <NotificationsHubProvider userProfile={profile}>
          <PresenceProvider userId={profile.uid}>
            <MobileView
              items={items}
              events={events}
              userProfile={profile}
              activeTab="chats"
              setActiveTab={() => undefined}
              onOpenNewPost={() => undefined}
              onOpenNewStuff={() => undefined}
              onOpenNewEvent={() => undefined}
              canAccessEvents
              onInitiateChat={() => undefined}
              onViewItem={() => undefined}
              onViewFeedPost={() => undefined}
              onViewEvent={() => undefined}
              onViewProfile={() => undefined}
              onEditItem={() => undefined}
              onLogout={() => undefined}
              onUpdateProfile={() => undefined}
              initialSelectedChatId="demo-chat-lamp"
              onClearInitialChat={() => undefined}
              onRefresh={() => undefined}
              onRefreshEvents={() => undefined}
              itemsHydrated
              eventsHydrated
              engagement={engagement}
              eventsEngagement={eventsEngagement}
            />
          </PresenceProvider>
        </NotificationsHubProvider>
      </DemoShell>
    );
  }

  // goget-listing — chair giveaway with Go Get route row
  return (
    <DemoShell>
      <ItemDetailView
        item={chairItem}
        currentUserId={profile.uid}
        userProfile={profile}
        onClose={() => undefined}
        onEdit={() => undefined}
        onUpdateStatus={() => undefined}
        onViewProfile={() => undefined}
        voteState={engagement.getVotesForPost(chairItem.id)}
        comments={engagement.getCommentsForPost(chairItem.id)}
        onVote={(dir) => engagement.handleVote(chairItem.id, chairItem.userId, dir)}
        onAddComment={(text) => engagement.handleAddComment(chairItem.id, text)}
      />
    </DemoShell>
  );
}
