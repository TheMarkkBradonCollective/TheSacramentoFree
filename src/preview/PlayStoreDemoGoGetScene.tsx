import { useMemo } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { NotificationsHubProvider } from '../contexts/NotificationsHubContext';
import { PresenceProvider } from '../contexts/PresenceContext';
import { useItemsEngagement } from '../hooks/useItemsEngagement';
import { useEventsEngagement } from '../hooks/useEventsEngagement';
import MobileView from '../components/MobileView';
import ItemDetailView from '../components/ItemDetailView';
import MapNavigationView from '../components/MapNavigationView';
import GoGetIncomingRingOverlay from '../components/goget/GoGetIncomingRingOverlay';
import GoGetRingWaitingPanel from '../components/goget/GoGetRingWaitingPanel';
import GoGetLiveTrackingCard from '../components/goget/GoGetLiveTrackingCard';
import GoGetMeetingMap from '../components/goget/GoGetMeetingMap';
import {
  DEMO_GOGET_ACTIVE_SESSION,
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
      <DemoShell className="p-4">
        <div className="max-w-md mx-auto mt-8 space-y-4">
          <div className="sbn-card p-4">
            <p className="text-sm font-semibold text-app">Solid oak dining chair</p>
            <p className="text-xs text-muted mt-1">Waiting for {DEMO_GOGET_AVERY_PROFILE.displayName} in East Sacramento</p>
          </div>
          <GoGetRingWaitingPanel
            session={DEMO_GOGET_WAITING_SESSION}
            item={chairItem}
            posterName={DEMO_GOGET_AVERY_PROFILE.displayName}
            onSessionChange={() => undefined}
            onCancel={() => undefined}
            onRingExpired={() => undefined}
          />
        </div>
      </DemoShell>
    );
  }

  if (scene === 'goget-navigation') {
    return (
      <MapNavigationView
        origin={SACRAMENTO_LOCATIONS.downtown}
        destination={{
          lat: SACRAMENTO_LOCATIONS.eastSac.lat,
          lng: SACRAMENTO_LOCATIONS.eastSac.lng,
        }}
        destinationLabel={`${SACRAMENTO_LOCATIONS.eastSac.label} porch`}
        onExit={() => undefined}
        navigationStartMessage={`Go Get pickup for ${chairItem.title}.`}
        navigationFollowUpMessages={['Head to the porch pickup in East Sacramento.']}
      />
    );
  }

  if (scene === 'goget-tracking') {
    return (
      <DemoShell className="p-4">
        <div className="max-w-md mx-auto mt-8 space-y-3">
          <div className="sbn-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted font-semibold">Go Get pickup</p>
            <p className="text-sm font-bold text-app mt-1">{chairItem.title}</p>
            <p className="text-xs text-muted mt-1">{SACRAMENTO_LOCATIONS.eastSac.label}</p>
          </div>
          <GoGetLiveTrackingCard
            sessionId={DEMO_GOGET_ACTIVE_SESSION.id}
            requesterName={profile.displayName}
            destinationLabel={DEMO_GOGET_ACTIVE_SESSION.destinationLabel}
            onOpenChat={() => undefined}
          />
        </div>
      </DemoShell>
    );
  }

  if (scene === 'goget-meeting') {
    return (
      <DemoShell className="p-0">
        <div className="flex flex-col h-screen">
          <div className="shrink-0 px-4 py-3 border-b border-app bg-surface">
            <p className="text-sm font-bold text-app">Heading to {DEMO_GOGET_AVERY_PROFILE.displayName}</p>
            <p className="text-xs text-muted">{DEMO_GOGET_ACTIVE_SESSION.destinationLabel}</p>
          </div>
          <div className="flex-1 min-h-0">
            <GoGetMeetingMap
              sessionId={DEMO_GOGET_ACTIVE_SESSION.id}
              destinationLat={DEMO_GOGET_ACTIVE_SESSION.destinationLat}
              destinationLng={DEMO_GOGET_ACTIVE_SESSION.destinationLng}
              destinationLabel={DEMO_GOGET_ACTIVE_SESSION.destinationLabel}
              posterName={DEMO_GOGET_AVERY_PROFILE.displayName}
              sharingEnabled
            />
          </div>
        </div>
      </DemoShell>
    );
  }

  if (scene === 'goget-arrived') {
    return (
      <DemoShell className="p-4">
        <div className="max-w-md mx-auto mt-8">
          <div className="sbn-card p-4 space-y-3" id="go_get_arrived_handoff">
            <p className="text-sm font-semibold text-app">{profile.displayName} has arrived.</p>
            <p className="text-xs text-muted">Confirm once the handoff is complete.</p>
            <p className="text-xs text-muted">{chairItem.title} · {SACRAMENTO_LOCATIONS.eastSac.label}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="sbn-btn sbn-btn-primary justify-center">
                <CheckCircle className="w-4 h-4" />
                Confirm pickup
              </button>
              <button type="button" className="sbn-btn sbn-btn-secondary justify-center">
                <XCircle className="w-4 h-4" />
                Something&apos;s wrong
              </button>
            </div>
          </div>
        </div>
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
