import React from 'react';
import { LogOut, Plus, MapPin } from 'lucide-react';
import { UserProfile } from '../types';
import { IN_APP } from '../siteContent';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';
import { AppTab } from '../lib/appTabs';

interface NavbarProps {
  userProfile: UserProfile | null;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onOpenNewPost: () => void;
  onLogout: () => void;
}

const TABS: { id: AppTab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'feed', label: 'Feed' },
  { id: 'events', label: IN_APP.eventsTabLabel },
  { id: 'chats', label: 'Messages' },
  { id: 'menu', label: IN_APP.menuTabLabel },
  { id: 'profile', label: IN_APP.accountTabLabel },
];

export default function Navbar({
  userProfile,
  activeTab,
  setActiveTab,
  onOpenNewPost,
  onLogout,
}: NavbarProps) {
  return (
    <header id="main_navbar" className="sticky top-0 z-40 sbn-glass-nav">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className="shrink-0"
            id="brand_logo_container"
          >
            <BrandLogo showTitle subtitle={IN_APP.brandSubtitle} />
          </button>

          {userProfile && (
            <nav className="hidden md:flex items-center gap-1" id="nav_links_container">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  id={`tab_${tab.id}_btn`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`sbn-nav-tab ${activeTab === tab.id ? 'sbn-nav-tab-active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2" id="navbar_actions_container">
            <ThemeToggle />
            {userProfile && (
              <>
                <div
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-soft text-accent text-xs font-semibold"
                  id="neighborhood_display_badge"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {userProfile.neighborhood}
                </div>
                <button
                  type="button"
                  id="navbar_create_post_btn"
                  onClick={onOpenNewPost}
                  className="sbn-btn sbn-btn-primary sbn-btn-sm hidden sm:inline-flex"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden lg:inline">{IN_APP.postButton}</span>
                </button>
                <button
                  type="button"
                  id="navbar_logout_btn"
                  onClick={onLogout}
                  title="Sign out"
                  className="p-2.5 rounded-full text-muted hover:text-app hover:bg-inset transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
