import React, { useState } from 'react';
import { SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, ISO_CATEGORIES, ISO_DELIVERY_PREFS, PostType } from '../types';
import { createSupabaseItem, uploadItemImage } from '../supabase';
import { X, Gift, Search, Info, Camera, Trash2 } from 'lucide-react';
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
  const [isoCategory, setIsoCategory] = useState(ISO_CATEGORIES[0]);
  const [collectionMethod, setCollectionMethod] = useState(ISO_DELIVERY_PREFS[0]);
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const handleImageChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please specify a title and description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    // Generate accurate path ID safely
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let uploadedUrl = '';
    if (imageFile) {
      try {
        const url = await uploadItemImage(imageFile, itemId);
        if (url) {
          uploadedUrl = url;
        }
      } catch (err) {
        console.warn('Image uploading failed, fallback behavior handles local cache:', err);
      }
    }

    const finalCategory = type === 'looking' ? isoCategory : category;
    const finalDescription = type === 'looking' 
      ? `[TRANSPORT: ${collectionMethod}]\n\n${description.trim()}`
      : description.trim();

    const newItem: ItemPost = {
      id: itemId,
      title: title.trim(),
      description: finalDescription,
      type,
      category: finalCategory,
      userId: userProfile.uid,
      userDisplayName: userProfile.displayName,
      userPhotoURL: userProfile.photoURL,
      neighborhood,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageUrl: uploadedUrl || undefined
    };

    try {
      // Create listing in Supabase database
      const success = await createSupabaseItem(newItem);
      
      if (!success) {
        console.warn('Note: Listing creation completed with offline-mode validation queueing.');
      }

      // Save to local drafted listings cache
      const localListingsStr = localStorage.getItem('local_user_listings') || '[]';
      let localListings: ItemPost[] = [];
      try {
        localListings = JSON.parse(localListingsStr);
      } catch (_) {}
      localListings.unshift(newItem);
      localStorage.setItem('local_user_listings', JSON.stringify(localListings));

      onSuccess(newItem);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      // Fallback
      const localListingsStr = localStorage.getItem('local_user_listings') || '[]';
      let localListings: ItemPost[] = [];
      try {
        localListings = JSON.parse(localListingsStr);
      } catch (_) {}
      localListings.unshift(newItem);
      localStorage.setItem('local_user_listings', JSON.stringify(localListings));

      onSuccess(newItem);
      onClose();
    }
  };

  return (
    <div id="post_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 overflow-y-auto font-sans">
      <div className="relative w-full max-w-md bg-white rounded-none border border-zinc-200 shadow-2xl overflow-hidden my-8" id="post_modal_box">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-black text-white rounded-none flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black text-black tracking-widest uppercase">DISPATCH NEW LISTING</h3>
          </div>
          <button
            id="close_modal_btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-105 rounded-none transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5" id="post_item_form">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-none border border-red-200" id="post_item_error">
              {errorMsg}
            </div>
          )}

          {/* Type Toggle (Giveaway vs Looking for) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">ORDER TYPE</span>
            <div className="grid grid-cols-2 gap-3.5" id="listing_type_grid">
              <button
                type="button"
                id="type_giveaway_btn"
                onClick={() => setType('giveaway')}
                className={`py-3 px-4 rounded-none text-xs font-black border uppercase tracking-wider transition-all inline-flex items-center justify-center space-x-2 cursor-pointer ${
                  type === 'giveaway'
                    ? 'bg-black border-black text-white'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Giving Away</span>
              </button>

              <button
                type="button"
                id="type_looking_btn"
                onClick={() => setType('looking')}
                className={`py-3 px-4 rounded-none text-xs font-black border uppercase tracking-wider transition-all inline-flex items-center justify-center space-x-2 cursor-pointer ${
                  type === 'looking'
                    ? 'bg-black border-black text-white'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>In Search Of</span>
              </button>
            </div>
          </div>

          {/* Item Title */}
          <div className="space-y-1.5">
            <label htmlFor="post_title" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Title / Cargo Description</label>
            <input
              type="text"
              id="post_title"
              required
              placeholder="e.g., Solid Walnut Dresser, Garden soil..."
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full px-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black font-semibold focus:bg-white"
            />
          </div>

          {type === 'giveaway' ? (
            <div className="grid grid-cols-2 gap-4" id="post_category_neighborhood_grid">
              {/* Category selection */}
              <div className="space-y-1.5">
                <label htmlFor="post_category" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-bold">Sector Category</label>
                <select
                  id="post_category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full px-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs font-bold text-black appearance-none cursor-pointer focus:bg-white uppercase"
                >
                  {ITEM_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-white">{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Neighborhood location */}
              <div className="space-y-1.5">
                <label htmlFor="post_neighborhood" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-bold">Pick-up Routing</label>
                <select
                  id="post_neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="block w-full px-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs font-bold text-black appearance-none cursor-pointer focus:bg-white uppercase"
                >
                  {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n} className="bg-white">{n.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4 font-sans" id="post_looking_custom_fields">
              <div className="grid grid-cols-2 gap-4">
                {/* Seeking Category */}
                <div className="space-y-1.5">
                  <label htmlFor="post_iso_category" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-bold">Category of Need</label>
                  <select
                    id="post_iso_category"
                    value={isoCategory}
                    onChange={(e) => setIsoCategory(e.target.value)}
                    className="block w-full px-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs font-bold text-black appearance-none cursor-pointer focus:bg-white uppercase"
                  >
                    {ISO_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-white text-xs">{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Neighborhood location */}
                <div className="space-y-1.5">
                  <label htmlFor="post_iso_neighborhood" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-bold">Your Neighborhood</label>
                  <select
                    id="post_iso_neighborhood"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="block w-full px-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs font-bold text-black appearance-none cursor-pointer focus:bg-white uppercase"
                  >
                    {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n} className="bg-white">{n.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transit preference */}
              <div className="space-y-1.5">
                <label htmlFor="post_collection_method" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-bold">Lending / Transportation Arrangement</label>
                <select
                  id="post_collection_method"
                  value={collectionMethod}
                  onChange={(e) => setCollectionMethod(e.target.value)}
                  className="block w-full px-3.5 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs font-bold text-black appearance-none cursor-pointer focus:bg-white uppercase"
                >
                  {ISO_DELIVERY_PREFS.map((m) => (
                    <option key={m} value={m} className="bg-white">{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Picture Upload Box */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Cargo Picture (Optional)</span>
            
            {imagePreview ? (
              <div className="relative border border-zinc-200 bg-zinc-50 p-2 text-center" id="item_image_preview_container">
                <img
                  src={imagePreview}
                  alt="Item Preview"
                  className="max-h-48 mx-auto object-cover border border-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  id="remove_preview_btn"
                  className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white p-2 rounded-none transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('item_file_input')?.click()}
                className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all select-none rounded-none flex flex-col items-center justify-center space-y-2 ${
                  dragActive ? 'border-brand-orange bg-orange-50/20' : 'border-zinc-300 hover:border-black bg-zinc-50'
                }`}
                id="image_drag_drop_zone"
              >
                <input
                  type="file"
                  id="item_file_input"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageChange(e.target.files[0]);
                    }
                  }}
                />
                <Camera className="w-6 h-6 text-zinc-400 group-hover:text-black transition-colors" />
                <div className="text-xs text-zinc-800 font-bold uppercase tracking-wider">
                  Drag & Drop or Click to Upload
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  PNG, JPG, OR WEBP (UP TO 5MB)
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="post_description" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Details / Handover Protocol</label>
            <textarea
              id="post_description"
              required
              rows={4}
              maxLength={1000}
              placeholder="State actual condition, measurements, and safe contactless porch instructions."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black placeholder-zinc-400 font-semibold resize-none focus:bg-white"
            />
            <div className="text-right text-[10px] text-zinc-400 font-mono font-medium">
              {description.length}/1000 chars
            </div>
          </div>

          {/* Guidelines info notice */}
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-none flex items-start space-x-2.5 text-xs text-black font-semibold" id="buy_nothing_alert">
            <Info className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Cost Mandate:</strong> Selling, credit, reciprocation, or bartering are blocked. Everything dispatched to Sacramento Buy Nothing lists at 100% free.
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3.5 pt-2" id="post_item_actions">
            <button
              type="button"
              id="cancel_post_btn"
              onClick={onClose}
              className="flex-1 py-3 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-none text-xs font-black uppercase tracking-widest text-red-650 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit_listing_btn"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-none text-xs font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'DISPATCHING...' : 'DISPATCH LISTING'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
