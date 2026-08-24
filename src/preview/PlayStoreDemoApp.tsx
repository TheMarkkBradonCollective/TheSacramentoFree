import { useCallback, useMemo, useState } from 'react';
import type { AnyTab, AppTab } from '../lib/appTabs';
import { persistActiveTab, parseTabFromPathname } from '../lib/appNavigation';
import { NotificationsHubProvider } from '../contexts/NotificationsHubContext';
import { PresenceProvider } from '../contexts/PresenceContext';
import { useItemsEngagement } from '../hooks/useItemsEngagement';
import { useEventsEngagement } from '../hooks/useEventsEngagement';
import MobileView from '../components/MobileView';
import PublicSite from '../components/public/PublicSite';
import ItemDetailView from '../components/ItemDetailView';
import EventDetailView from '../components/EventDetailView';
import FeedPostDetailView from '../components/feed/FeedPostDetailView';
import type { CommunityEvent, FeedPost, ItemPost } from '../types';
import {
  PLAY_STORE_DEMO_EVENTS,
  PLAY_STORE_DEMO_ITEMS,
  PLAY_STORE_DEMO_PROFILE,
  isPlayStoreDemoPublicHome,
} from './playStoreDemo';
import { parsePlayStoreGoGetScene } from './playStoreDemoGoGet';
import PlayStoreDemoGoGetScene from './PlayStoreDemoGoGetScene';

const noopAsync = async () => false;

export default function PlayStoreDemoApp() {
  const goGetScene = parsePlayStoreGoGetScene();
  if (goGetScene) {
    return <PlayStoreDemoGoGetScene scene={goGetScene} />;
  }

  const profile = PLAY_STORE_DEMO_PROFILE;
  const items = PLAY_STORE_DEMO_ITEMS;
  const events = PLAY_STORE_DEMO_EVENTS;
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const eventIds = useMemo(() => events.map((event) => event.id), [events]);
  const engagement = useItemsEngagement(itemIds, profile);
  const eventsEngagement = useEventsEngagement(eventIds, profile);

  const [activeTab, setActiveTab] = useState<AnyTab>(
    () => parseTabFromPathname(window.location.pathname) || 'feed',
  );
  const [detailItem, setDetailItem] = useState<ItemPost | null>(null);
  const [detailEvent, setDetailEvent] = useState<CommunityEvent | null>(null);
  const [detailFeedPost, setDetailFeedPost] = useState<FeedPost | null>(null);
  const publicHome = isPlayStoreDemoPublicHome();

  const handleTabChange = useCallback((tab: AnyTab) => {
    setActiveTab(tab);
    persistActiveTab(tab as AppTab, profile.uid);
  }, [profile.uid]);

  if (publicHome) {
    return (
      <div id="app_root_layout" className="min-h-screen flex flex-col mesh-bg text-app antialiased font-sans">
        <PublicSite
          onEmailSignIn={noopAsync}
          onEmailSignUp={noopAsync}
          items={items}
          isItemsLoading={false}
          onViewListing={setDetailItem}
          onRequireSignIn={() => {
            window.location.assign('/feed');
          }}
        />
        {detailItem ? (
          <ItemDetailView
            item={detailItem}
            currentUserId=""
            onClose={() => setDetailItem(null)}
            onEdit={() => undefined}
            onUpdateStatus={() => undefined}
            onViewProfile={() => undefined}
            voteState={engagement.getVotesForPost(detailItem.id)}
            comments={engagement.getCommentsForPost(detailItem.id)}
            onVote={() => undefined}
            onAddComment={() => undefined}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div id="app_root_layout" className="min-h-screen flex flex-col mesh-bg text-app antialiased font-sans">
      <NotificationsHubProvider userProfile={profile}>
        <PresenceProvider userId={profile.uid}>
          <MobileView
            items={items}
            events={events}
            userProfile={profile}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onOpenNewPost={() => undefined}
            onOpenNewStuff={() => undefined}
            onOpenNewEvent={() => undefined}
            canAccessEvents
            onInitiateChat={() => undefined}
            onViewItem={setDetailItem}
            onViewFeedPost={setDetailFeedPost}
            onViewEvent={setDetailEvent}
            onViewProfile={() => undefined}
            onEditItem={() => undefined}
            onLogout={() => undefined}
            onUpdateProfile={() => undefined}
            initialSelectedChatId={null}
            onClearInitialChat={() => undefined}
            onRefresh={() => undefined}
            onRefreshEvents={() => undefined}
            itemsHydrated
            eventsHydrated
            engagement={engagement}
            eventsEngagement={eventsEngagement}
          />
          {detailFeedPost ? (
            <FeedPostDetailView
              post={detailFeedPost}
              userProfile={profile}
              onClose={() => setDetailFeedPost(null)}
            />
          ) : null}
          {detailItem ? (
            <ItemDetailView
              item={detailItem}
              currentUserId={profile.uid}
              userProfile={profile}
              onClose={() => setDetailItem(null)}
              onEdit={() => undefined}
              onUpdateStatus={() => undefined}
              onViewProfile={() => undefined}
              voteState={engagement.getVotesForPost(detailItem.id)}
              comments={engagement.getCommentsForPost(detailItem.id)}
              onVote={(dir) => engagement.handleVote(detailItem.id, detailItem.userId, dir)}
              onAddComment={(text) => engagement.handleAddComment(detailItem.id, text)}
            />
          ) : null}
          {detailEvent ? (
            <EventDetailView
              event={detailEvent}
              allEvents={events}
              currentUserId={profile.uid}
              userProfile={profile}
              rsvpState={eventsEngagement.getRsvpsForEvent(detailEvent.id)}
              comments={eventsEngagement.getCommentsForEvent(detailEvent.id)}
              onRsvp={(status) => eventsEngagement.handleRsvp(detailEvent.id, detailEvent.userId, status)}
              onAddComment={(text) => eventsEngagement.handleAddComment(detailEvent.id, text)}
              onClose={() => setDetailEvent(null)}
              onViewProfile={() => undefined}
            />
          ) : null}
        </PresenceProvider>
      </NotificationsHubProvider>
    </div>
  );
}
