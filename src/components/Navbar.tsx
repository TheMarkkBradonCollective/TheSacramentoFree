import React, { useState } from 'react';
import { LogOut, MessageSquare, Plus, User, MapPin, Gift } from 'lucide-react';
import { UserProfile } from '../types';
import { IN_APP } from '../siteContent';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  userProfile: UserProfile | null;
  activeTab: 'feed' | 'chats' | 'profile' | 'map';
  setActiveTab: (tab: 'feed' | 'chats' | 'profile' | 'map') => void;
  onOpenNewPost: () => void;
  onLogout: () => void;
}

const TABS: { id: 'feed' | 'map' | 'chats' | 'profile'; label: string; icon?: React.ReactNode }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'map', label: 'Map' },
  { id: 'chats', label: 'Messages' },
  { id: 'profile', label: 'Profile' },
];

export default function Navbar({
  userProfile,
  activeTab,
  setActiveTab,
  onOpenNewPost,
  onLogout,
}: NavbarProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header id="main_navbar" className="sticky top-0 z-40 sbn-glass-nav">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className="flex items-center gap-3 shrink-0"
            id="brand_logo_container"
          >
            {!logoFailed ? (
              <img
                src="https://nezmabanjoqdzikliysd.supabase.co/storage/v1/object/public/SacramentoBuyNothing/876852c0-541a-11f1-9143-af3d50fee019.webp"
                alt="Sacramento Buy Nothing"
                className="h-9 w-auto object-contain rounded-lg"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <>
                <div className="w-9 h-9 bg-accent text-on-accent rounded-xl flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-display font-bold text-sm text-app leading-tight">
                    Sacramento <span className="text-accent">Buy Nothing</span>
                  </p>
                  <p className="text-[11px] text-muted">{IN_APP.brandSubtitle}</p>
                </div>
              </>
            )}
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
