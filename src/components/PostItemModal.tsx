import React, { useState } from 'react';
import { SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, PostType } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { createSupabaseItem } from '../supabase';
import { X, Gift, Search, Info } from 'lucide-react';
import { UserProfile, ItemPost } from '../types';

interface PostItemModalProps {
  userProfile: UserProfile;
  onClose: () => void;
  onSuccess: (newItem: ItemPost) => void;
}

export default function PostItemModal({ userProfile, onClose, onSuccess }: PostItemModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PostType>('giveaway');
  const [category, setCategory] = useState(ITEM_CATEGORIES[0]);
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please specify a title and description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    // Generate accurate path ID safely
    const itemsCollectionRef = collection(db, 'items');
    const newItemDocRef = doc(itemsCollectionRef);
    const itemId = newItemDocRef.id;

    const newItem: ItemPost = {
      id: itemId,
      title: title.trim(),
      description: description.trim(),
      type,
      category,
      userId: userProfile.uid,
      userDisplayName: userProfile.displayName,
      userPhotoURL: userProfile.photoURL,
      neighborhood,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // Create listing in Supabase database
      try {
        await createSupabaseItem(newItem);
      } catch (sbErr) {
        console.warn('Supabase listing creation insert bypassed or failed:', sbErr);
      }

      await setDoc(newItemDocRef, {
        ...newItem,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      onSuccess(newItem);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      try {
        handleFirestoreError(err, OperationType.CREATE, `items/${itemId}`);
      } catch (authError: any) {
        setErrorMsg('Security breach or validation failure. Unable to submit listing.');
        console.error(authError);
      }
    }
  };

  return (
    <div id="post_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md glass rounded-3xl shadow-2xl border border-white/45 overflow-hidden my-8" id="post_modal_box">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/50 border-b border-white/30">
          <div className="flex items-center space-x-2">
            <Gift className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-black text-slate-800 tracking-tight">Create Community Listing</h3>
          </div>
          <button
            id="close_modal_btn"
            onClick={onClose}
            className="p-1.5 text-slate-555 hover:text-slate-850 hover:bg-white/40 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5" id="post_item_form">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 text-red-700 text-xs font-semibold rounded-lg border border-red-500/20" id="post_item_error">
              {errorMsg}
            </div>
          )}

          {/* Type Toggle (Giveaway vs Looking for) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block header">Listing Type</span>
            <div className="grid grid-cols-2 gap-3" id="listing_type_grid">
              <button
                type="button"
                id="type_giveaway_btn"
                onClick={() => setType('giveaway')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all inline-flex items-center justify-center space-x-2 cursor-pointer ${
                  type === 'giveaway'
                    ? 'bg-white/70 border-white/60 text-emerald-800 shadow-sm'
                    : 'bg-white/15 border-white/20 text-slate-600 hover:bg-white/30'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Giving Away (Give)</span>
              </button>

              <button
                type="button"
                id="type_looking_btn"
                onClick={() => setType('looking')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all inline-flex items-center justify-center space-x-2 cursor-pointer ${
                  type === 'looking'
                    ? 'bg-white/70 border-white/60 text-emerald-800 shadow-sm'
                    : 'bg-white/15 border-white/20 text-slate-600 hover:bg-white/30'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Looking For (Ask)</span>
              </button>
            </div>
          </div>

          {/* Item Title */}
          <div className="space-y-1.5">
            <label htmlFor="post_title" className="text-[10px] font-bold text-slate-555 uppercase tracking-widest block">Item Name / Title</label>
            <input
              type="text"
              id="post_title"
              required
              placeholder="e.g., Wooden Dining Chair, Slow Cooker, Baby formula"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full px-3 py-2 search-glass rounded-xl text-xs text-slate-900 placeholder-slate-500 font-bold focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4" id="post_category_neighborhood_grid">
            {/* Category selection */}
            <div className="space-y-1.5">
              <label htmlFor="post_category" className="text-[10px] font-bold text-slate-555 uppercase tracking-widest block">Category</label>
              <select
                id="post_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-3 py-2 bg-white/45 border border-white/45 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-white">{c}</option>
                ))}
              </select>
            </div>

            {/* Neighborhood location */}
            <div className="space-y-1.5">
              <label htmlFor="post_neighborhood" className="text-[10px] font-bold text-slate-555 uppercase tracking-widest block">Pick-up Location</label>
              <select
                id="post_neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="block w-full px-3 py-2 bg-white/45 border border-white/45 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              >
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} className="bg-white">{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="post_description" className="text-[10px] font-bold text-slate-555 uppercase tracking-widest block">Details / Condition</label>
            <textarea
              id="post_description"
              required
              rows={4}
              maxLength={1000}
              placeholder="Provide a helpful description! Mention the item's condition, dimensions, pick-up details (e.g. contactless porch pick-up), and availability."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full p-3 search-glass rounded-xl text-xs text-slate-900 placeholder-slate-500 font-bold focus:outline-hidden resize-none"
            />
            <div className="text-right text-[10px] text-slate-500 font-mono font-bold">
              {description.length}/1000 chars
            </div>
          </div>

          {/* Guidelines info notice */}
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/15 flex items-start space-x-2 text-xs text-emerald-850 font-bold" id="buy_nothing_alert">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              BuyNothing rule check: Everything listed must be entirely free. Trading, bartering, and selling are strictly prohibited.
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-2" id="post_item_actions">
            <button
              type="button"
              id="cancel_post_btn"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/20 hover:bg-white/35 border border-white/35 rounded-full text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit_listing_btn"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting...' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
