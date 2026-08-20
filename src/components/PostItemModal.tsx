import React, { useCallback, useEffect, useState } from 'react';
import { SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, ISO_CATEGORIES, ISO_DELIVERY_PREFS, PostType, mapGPSToPercent, NEIGHBORHOOD_COORDS, findClosestNeighborhood, findClosestNeighborhoodByLatLng } from '../types';
import { createSupabaseItem, updateSupabaseItem, uploadItemImage, getListingSubitems, replaceListingSubitems } from '../supabase';
import {
  buildListingDescription,
  categoryRequiresGps,
  parseItemForEditForm,
} from '../lib/itemLocation';
import {
  appendPhotosToDescription,
  extractListingImageUrls,
  isPersistableListingImageUrl,
  MAX_LISTING_PHOTOS,
} from '../lib/listingContent';
import { isLikelyImageFile, INVALID_IMAGE_FILE_MESSAGE } from '../lib/imageUrl';
import { X, Gift, Search, Info, Camera, Trash2, Navigation, Map, MapPin, Pencil, Plus, ArrowLeftRight } from 'lucide-react';
import { UserProfile, ItemPost } from '../types';
import { RULES } from '../siteContent';
import { getPostTypeModalTitle } from '../lib/postType';

interface PostItemModalProps {
  userProfile: UserProfile;
  editItem?: ItemPost | null;
  onClose: () => void;
  onSuccess: (item: ItemPost) => void;
}

export default function PostItemModal({ userProfile, editItem = null, onClose, onSuccess }: PostItemModalProps) {
  const isEditing = !!editItem;
  const isReposting = isEditing && editItem?.status === 'withdrawn';
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [type, setType] = useState<PostType>('giveaway');
  const [category, setCategory] = useState(ITEM_CATEGORIES[0]);
  const [isoCategory, setIsoCategory] = useState(ISO_CATEGORIES[0]);
  const [collectionMethod, setCollectionMethod] = useState(ISO_DELIVERY_PREFS[0]);
  const [tradeSeeking, setTradeSeeking] = useState('');
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedImageUrls, setSavedImageUrls] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // GPS and Map selection utility state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [customCoords, setCustomCoords] = useState<{ x: number; y: number } | null>(null);
  const [locationIsPublic, setLocationIsPublic] = useState(true);
  const [pickupAddress, setPickupAddress] = useState('');
  const [multipleItems, setMultipleItems] = useState(false);
  const [subItemLabels, setSubItemLabels] = useState<string[]>(['']);

  const activeCategory = type === 'looking' ? isoCategory : category;

  useEffect(() => {
    if (!editItem) return;

    const parsed = parseItemForEditForm(editItem);
    setTitle(editItem.title);
    setDetails(parsed.details);
    setPickupNotes(parsed.pickupNotes);
    setType(editItem.type);
    setNeighborhood(editItem.neighborhood);
    setCollectionMethod(parsed.collectionMethod);
    setTradeSeeking(parsed.tradeSeeking);
    setCustomCoords(parsed.customCoords);
    setLocationIsPublic(parsed.locationIsPublic);
    setPickupAddress(parsed.pickupAddress);
    setShowMiniMap(!!parsed.customCoords);
    setPendingImages([]);
    setSavedImageUrls(extractListingImageUrls(editItem));
    setErrorMsg('');
    setGpsStatus('');

    if (editItem.type === 'looking') {
      setIsoCategory(
        ISO_CATEGORIES.includes(editItem.category) ? editItem.category : ISO_CATEGORIES[0],
      );
      setMultipleItems(false);
      setSubItemLabels(['']);
    } else if (editItem.type === 'trade') {
      setCategory(
        ITEM_CATEGORIES.includes(editItem.category) ? editItem.category : ITEM_CATEGORIES[0],
      );
      setMultipleItems(false);
      setSubItemLabels(['']);
    } else {
      setCategory(
        ITEM_CATEGORIES.includes(editItem.category) ? editItem.category : ITEM_CATEGORIES[0],
      );
      void getListingSubitems(editItem.id).then((subs) => {
        if (subs.length > 0) {
          setMultipleItems(true);
          setSubItemLabels(subs.map((s) => s.label));
        } else {
          setMultipleItems(false);
          setSubItemLabels(['']);
        }
      });
    }
  }, [editItem]);

  const applyGpsPosition = useCallback((latitude: number, longitude: number) => {
    const coords = mapGPSToPercent(latitude, longitude);
    setCustomCoords(coords);
    const closest = findClosestNeighborhoodByLatLng(latitude, longitude);
    setNeighborhood(closest);
    setGpsStatus(
      `Using your current location in ${closest.toUpperCase()} — change or remove the pin if needed.`,
    );
    setShowMiniMap(true);
  }, []);

  useEffect(() => {
    if (editItem || !navigator.geolocation) return;

    setGpsLoading(true);
    setGpsStatus('Setting pickup spot to your current location…');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyGpsPosition(position.coords.latitude, position.coords.longitude);
        setGpsLoading(false);
      },
      () => {
        setGpsStatus('Could not detect location — set a pin manually with GPS or the map.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, [editItem, applyGpsPosition]);

  const handleDetectGPS = () => {
    setGpsLoading(true);
    setGpsStatus('Accessing browser location sensors...');
    if (!navigator.geolocation) {
      setGpsStatus('Error: Location lookup unsupported by browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyGpsPosition(position.coords.latitude, position.coords.longitude);
        setGpsLoading(false);
      },
      (error) => {
        console.warn('GPS location fetch error:', error);
        let errMsg = 'Access Timed Out. Please pick manually.';
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = 'Permission Denied. Please enable GPS permissions.';
        }
        setGpsStatus(errMsg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  const handleClearPin = () => {
    setCustomCoords(null);
    setGpsStatus('Map pin removed — use GPS, the map, or your neighborhood to set a new spot.');
    setShowMiniMap(false);
  };

  const totalPhotoCount = savedImageUrls.length + pendingImages.length;

  const addImageFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => isLikelyImageFile(f));
    if (list.length === 0) {
      setErrorMsg(INVALID_IMAGE_FILE_MESSAGE);
      return;
    }

    const slotsLeft = MAX_LISTING_PHOTOS - totalPhotoCount;
    const toAdd = list.slice(0, Math.max(0, slotsLeft));
    if (toAdd.length === 0) {
      setErrorMsg(`You can add up to ${MAX_LISTING_PHOTOS} photos per listing.`);
      return;
    }

    setPendingImages((prev) => [
      ...prev,
      ...toAdd.map((file) => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
    setErrorMsg('');
  };

  const removeSavedImage = (url: string) => {
    setSavedImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
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
    if (e.dataTransfer.files?.length) {
      addImageFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !details.trim()) {
      setErrorMsg('Please add a title and item details.');
      return;
    }

    if (type === 'trade' && !tradeSeeking.trim()) {
      setErrorMsg('Please describe what you want in trade.');
      return;
    }

    if (type === 'giveaway' && multipleItems) {
      const labels = subItemLabels.map((l) => l.trim()).filter(Boolean);
      if (labels.length < 2) {
        setIsSubmitting(false);
        setErrorMsg('Add at least two items when using multiple items mode.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const itemId = isEditing && editItem
      ? editItem.id
      : `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const imageUrls: string[] = savedImageUrls.filter((url) => isPersistableListingImageUrl(url));
    for (let i = 0; i < pendingImages.length; i++) {
      const url = await uploadItemImage(pendingImages[i].file, `${itemId}_${i}`);
      if (!url || !isPersistableListingImageUrl(url)) {
        setIsSubmitting(false);
        setErrorMsg('Could not upload photos. Check your connection and try again.');
        return;
      }
      imageUrls.push(url);
    }
    const imageUrl = imageUrls[0];

    const finalCategory = type === 'looking' ? isoCategory : category;

    if ((type === 'giveaway' || type === 'trade') && categoryRequiresGps(finalCategory) && !customCoords) {
      setIsSubmitting(false);
      setErrorMsg('Curb Alert and Porch Pickup require a pinned pickup spot. Use GPS or tap the map.');
      return;
    }

    let finalDescription = buildListingDescription({
      type,
      details: details.trim(),
      pickupNotes: pickupNotes.trim() || undefined,
      collectionMethod,
      tradeSeeking: type === 'trade' ? tradeSeeking.trim() : undefined,
      customCoords,
      locationIsPublic: categoryRequiresGps(finalCategory) ? true : locationIsPublic,
      pickupAddress: pickupAddress.trim() || undefined,
    });
    finalDescription = appendPhotosToDescription(finalDescription, imageUrls);

    const listing: ItemPost = {
      id: itemId,
      title: title.trim(),
      description: finalDescription,
      type,
      category: finalCategory,
      userId: userProfile.uid,
      userDisplayName: userProfile.displayName,
      userPhotoURL: userProfile.photoURL,
      neighborhood,
      status: isReposting ? 'active' : isEditing && editItem ? editItem.status : 'active',
      createdAt:
        isReposting || !isEditing
          ? new Date().toISOString()
          : editItem!.createdAt,
      updatedAt: new Date().toISOString(),
      imageUrl,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    };

    try {
      const result = isEditing
        ? await updateSupabaseItem(listing, isReposting ? { repost: true } : undefined)
        : await createSupabaseItem(listing, userProfile);

      if (!result.ok) {
        setIsSubmitting(false);
        setErrorMsg(
          result.errorMessage ||
            (isReposting
              ? 'Unable to repost listing. Please try again.'
              : isEditing
                ? 'Unable to save changes. Please try again.'
                : 'Unable to publish listing. Please try again.'),
        );
        return;
      }

      if (type === 'giveaway' && multipleItems) {
        const subResult = await replaceListingSubitems(
          itemId,
          subItemLabels.map((l) => l.trim()).filter(Boolean),
        );
        if (!subResult.ok) {
          setIsSubmitting(false);
          setErrorMsg(subResult.errorMessage || 'Listing saved but items list failed to save.');
          return;
        }
      }

      onSuccess(listing);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isReposting
            ? 'Unable to repost listing. Please try again.'
            : isEditing
              ? 'Unable to save changes. Please try again.'
              : 'Unable to publish listing. Please try again.',
      );
    }
  };

  return (
    <div id="post_modal_overlay" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 py-8">
      <div className="relative w-full max-w-lg sbn-card-elevated overflow-hidden" id="post_modal_box">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-app bg-accent-soft/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-accent text-on-accent rounded-xl flex items-center justify-center">
              {isEditing ? (
                <Pencil className="w-4 h-4" />
              ) : type === 'looking' ? (
                <Search className="w-4 h-4" />
              ) : type === 'trade' ? (
                <ArrowLeftRight className="w-4 h-4" />
              ) : (
                <Gift className="w-4 h-4" />
              )}
            </div>
            <h3 className="text-base font-bold text-app font-display">
              {getPostTypeModalTitle(type, isEditing, isReposting)}
            </h3>
          </div>
          <button
            id="close_modal_btn"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-muted hover:text-app hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5" id="post_item_form">
          {errorMsg && (
            <div className="p-3 bg-red-950/55 text-red-400 text-xs font-bold rounded-xl border border-red-900" id="post_item_error">
              {errorMsg}
            </div>
          )}

          {/* Type Toggle (Giveaway vs Looking vs Trade) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">What kind of post is this?</span>
            <div className="grid grid-cols-3 gap-2" id="listing_type_grid">
              <button
                type="button"
                id="type_giveaway_btn"
                onClick={() => setType('giveaway')}
                className={`py-3 px-2 rounded-xl text-[10px] font-bold border uppercase tracking-wider transition-all inline-flex items-center justify-center space-x-1.5 cursor-pointer ${
                  type === 'giveaway'
                    ? 'bg-accent border-accent text-white shadow-xs'
                    : 'bg-inset border-app text-muted hover:bg-surface-hover'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Giving Away</span>
              </button>

              <button
                type="button"
                id="type_looking_btn"
                onClick={() => setType('looking')}
                className={`py-3 px-2 rounded-xl text-[10px] font-bold border uppercase tracking-wider transition-all inline-flex items-center justify-center space-x-1.5 cursor-pointer ${
                  type === 'looking'
                    ? 'bg-accent border-accent text-white shadow-xs'
                    : 'bg-inset border-app text-muted hover:bg-surface-hover'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Looking For</span>
              </button>

              <button
                type="button"
                id="type_trade_btn"
                onClick={() => setType('trade')}
                className={`py-3 px-2 rounded-xl text-[10px] font-bold border uppercase tracking-wider transition-all inline-flex items-center justify-center space-x-1.5 cursor-pointer ${
                  type === 'trade'
                    ? 'bg-accent border-accent text-white shadow-xs'
                    : 'bg-inset border-app text-muted hover:bg-surface-hover'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Trade</span>
              </button>
            </div>
            {type === 'trade' && (
              <p className="text-[10px] text-muted leading-snug">
                Free item-for-item swaps only — no money, selling, or cash on the side.
              </p>
            )}
          </div>

          {/* Item Title */}
          <div className="space-y-1.5">
            <label htmlFor="post_title" className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              {type === 'looking'
                ? 'What are you looking for? (ISO Request)'
                : type === 'trade'
                  ? 'What are you offering to trade?'
                  : 'What are you sharing?'}
            </label>
            <input
              type="text"
              id="post_title"
              required
              placeholder={
                type === 'looking'
                  ? 'e.g., Lawn mower to borrow, Baby blankets, Canned food...'
                  : type === 'trade'
                    ? 'e.g., Stack of sci-fi paperbacks, Kids bike (24"), Plant cuttings...'
                    : 'e.g., Solid Walnut Dresser, Garden soil...'
              }
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-xs text-app font-semibold focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors focus:outline-hidden"
            />
          </div>

          {type === 'trade' && (
            <div className="space-y-1.5">
              <label htmlFor="post_trade_seeking" className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                What do you want in trade?
              </label>
              <input
                type="text"
                id="post_trade_seeking"
                required
                placeholder="e.g., Board games, Kitchen gadgets, Yarn & craft supplies..."
                value={tradeSeeking}
                maxLength={120}
                onChange={(e) => setTradeSeeking(e.target.value)}
                className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-xs text-app font-semibold focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors focus:outline-hidden"
              />
            </div>
          )}

          {type === 'giveaway' && (
            <div className="space-y-2 border border-app rounded-xl p-3.5 bg-inset/30">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-app cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-app text-accent focus:ring-accent"
                  checked={multipleItems}
                  onChange={(e) => {
                    setMultipleItems(e.target.checked);
                    if (e.target.checked && subItemLabels.every((l) => !l.trim())) {
                      setSubItemLabels(['', '']);
                    }
                  }}
                />
                Multiple items in this post
              </label>
              <p className="text-[10px] text-muted leading-snug pl-6">
                Neighbors can claim items one at a time. The post stays open until everything is picked up.
              </p>
              {multipleItems && (
                <div className="space-y-2 pl-1 pt-1">
                  {subItemLabels.map((label, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={label}
                        maxLength={80}
                        placeholder={`Item ${idx + 1} (e.g. Blue armchair)`}
                        onChange={(e) => {
                          const next = [...subItemLabels];
                          next[idx] = e.target.value;
                          setSubItemLabels(next);
                        }}
                        className="block flex-1 px-3 py-2 bg-inset border border-app rounded-xl text-xs text-app font-medium focus:border-accent focus:outline-hidden"
                      />
                      {subItemLabels.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setSubItemLabels(subItemLabels.filter((_, i) => i !== idx))}
                          className="p-2 text-muted hover:text-red-400"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSubItemLabels([...subItemLabels, ''])}
                    className="text-xs font-bold text-accent inline-flex items-center gap-1 pl-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another item
                  </button>
                </div>
              )}
            </div>
          )}

          {type === 'giveaway' || type === 'trade' ? (
            /* Category selection */
            <div className="space-y-1.5" id="post_category_section">
              <label htmlFor="post_category" className="text-[10px] font-black text-muted uppercase tracking-widest block font-bold">Sector Category</label>
              <select
                id="post_category"
                value={category}
                onChange={(e) => {
                  const next = e.target.value;
                  setCategory(next);
                  if (categoryRequiresGps(next)) setLocationIsPublic(true);
                }}
                className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-xs font-bold text-app cursor-pointer focus:border-accent focus:outline-hidden uppercase"
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-surface text-app">{c.toUpperCase()}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-4 font-sans" id="post_looking_custom_fields">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Seeking Category */}
                <div className="space-y-1.5">
                  <label htmlFor="post_iso_category" className="text-[10px] font-black text-muted uppercase tracking-widest block font-bold">Category of Need</label>
                  <select
                    id="post_iso_category"
                    value={isoCategory}
                    onChange={(e) => setIsoCategory(e.target.value)}
                    className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-xs font-bold text-app cursor-pointer focus:border-accent focus:outline-hidden uppercase"
                  >
                    {ISO_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-surface text-app select-dark-opt">{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Transit preference */}
                <div className="space-y-1.5">
                  <label htmlFor="post_collection_method" className="text-[10px] font-black text-muted uppercase tracking-widest block font-bold">Transit arrangement</label>
                  <select
                    id="post_collection_method"
                    value={collectionMethod}
                    onChange={(e) => setCollectionMethod(e.target.value)}
                    className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-xs font-bold text-app cursor-pointer focus:border-accent focus:outline-hidden uppercase"
                  >
                    {ISO_DELIVERY_PREFS.map((m) => (
                      <option key={m} value={m} className="bg-surface text-app select-dark-opt">{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Pickup location: GPS pin + street address */}
          <div className="space-y-3 border-t border-app pt-4" id="post_location_coordinates_section">
            <div>
              <label className="text-[10px] font-black text-muted uppercase tracking-widest block font-mono">
                Pickup location (GPS + address)
              </label>
              <p className="text-[10px] text-muted mt-1 leading-snug">
                Pin the spot on the map and add a street address. Curb Alert and Porch Pickup require a GPS pin.
                If the pin is hidden from the public map, share GPS and address in messages.
              </p>
            </div>

            <div className="rounded-xl border border-app bg-inset/40 p-3 space-y-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Map pin (GPS)</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  id="post_final_neighborhood"
                  value={neighborhood}
                  onChange={(e) => {
                    setNeighborhood(e.target.value);
                    setGpsStatus('');
                  }}
                  className="block w-full px-3.5 py-3 bg-inset border border-app rounded-xl text-xs font-bold text-app cursor-pointer focus:border-accent focus:outline-hidden uppercase"
                >
                  {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                    <option key={`unified_neigh_${n}`} value={n} className="bg-surface text-app select-dark-opt">{n.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* GPS Button */}
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={gpsLoading}
                title="Detect current location via GPS"
                aria-label="Detect current location via GPS"
                className="px-3.5 bg-inset hover:bg-surface-hover border border-app rounded-xl text-muted flex items-center justify-center cursor-pointer transition-all select-none disabled:opacity-50"
              >
                <Navigation className={`w-4 h-4 text-muted ${gpsLoading ? 'animate-spin text-accent' : ''}`} />
              </button>

              {/* Map Button */}
              <button
                type="button"
                onClick={() => setShowMiniMap(!showMiniMap)}
                title="Pinpoint neighborhood on interactive district map"
                aria-label="Pinpoint neighborhood on interactive district map"
                aria-pressed={showMiniMap}
                className={`px-3.5 border rounded-xl flex items-center justify-center cursor-pointer transition-all select-none ${
                  showMiniMap
                    ? 'bg-accent border-accent text-white'
                    : 'bg-inset hover:bg-surface-hover border-app text-muted'
                }`}
              >
                <Map className="w-4 h-4 text-current" />
              </button>
            </div>

            {/* GPS Feedback text */}
            {gpsStatus && (
              <p className="text-[9.5px] font-black text-muted tracking-wider uppercase flex items-center gap-1.5 mt-1 font-mono">
                <span className="w-1.5 h-1.5 bg-accent rounded-full inline-block animate-ping"></span>
                {gpsStatus}
              </p>
            )}

            {type !== 'looking' && categoryRequiresGps(activeCategory) && (
              <p className="text-xs text-accent font-medium">
                {activeCategory} listings must include a map pin so neighbors can find the curb or porch.
              </p>
            )}

            {type !== 'looking' && customCoords && !categoryRequiresGps(activeCategory) && (
              <label className="flex items-start gap-2.5 text-xs text-app cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationIsPublic}
                  onChange={(e) => setLocationIsPublic(e.target.checked)}
                  className="mt-0.5 accent-accent"
                />
                <span>
                  Show exact pickup spot on the public map. If unchecked, share GPS and address in chat instead.
                </span>
              </label>
            )}

            {customCoords && (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold text-accent flex items-center gap-1.5 flex-1 min-w-[12rem]">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  GPS pin set — neighbors {locationIsPublic || categoryRequiresGps(activeCategory) ? 'can' : 'cannot'} see it on the map until you share in chat.
                </p>
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="sbn-btn sbn-btn-ghost sbn-btn-sm shrink-0"
                >
                  Remove pin
                </button>
              </div>
            )}

            {/* Micro Sacramento Map Picker */}
            {showMiniMap &&
              <div className="border border-app bg-inset p-2 mt-2 select-none relative rounded-xl" id="sac_mini_map_picker_container">
                <div className="flex items-center justify-between pb-1.5 border-b border-app mb-2">
                  <span className="text-[8.5px] font-black text-subtle uppercase tracking-widest font-mono">Sacramento District map Grid</span>
                  <span className="text-[9px] font-extrabold text-accent uppercase font-mono">{neighborhood.toUpperCase()} SECTOR</span>
                </div>
                <div 
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
                    const clampedX = Math.max(5, Math.min(95, clickX));
                    const clampedY = Math.max(5, Math.min(95, clickY));
                    setCustomCoords({ x: clampedX, y: clampedY });
                    
                    const nearest = findClosestNeighborhood(clampedX, clampedY);
                    setNeighborhood(nearest);
                    setGpsStatus(`SET CUSTOM LOCATION PIN POINT: ${clampedX.toFixed(1)}%, ${clampedY.toFixed(1)}% 📍`);
                  }}
                  className="relative w-full aspect-video bg-[#0A0A0B] border border-app overflow-hidden cursor-crosshair rounded-lg" 
                  id="mini_svg_canvas"
                >
                  {/* Rivers */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                      d="M 40,0 Q 38,20 34,40 T 26,62 T 28,82 T 22,100"
                      fill="none"
                      stroke="#1D4ED8"
                      strokeWidth="3.5"
                      opacity="0.5"
                    />
                    <path
                      d="M 100,28 C 85,30 75,25 60,35 T 34,40"
                      fill="none"
                      stroke="#1D4ED8"
                      strokeWidth="3"
                      opacity="0.5"
                    />
                  </svg>

                  {/* Center of the area relative markers are hidden to keep map clean of generic neighborhood icons */}

                  {/* Precise Custom Pin */}
                  {(() => {
                    const activeX = customCoords ? customCoords.x : (NEIGHBORHOOD_COORDS[neighborhood]?.x || 50);
                    const activeY = customCoords ? customCoords.y : (NEIGHBORHOOD_COORDS[neighborhood]?.y || 50);

                    return (
                      <div 
                        style={{ left: `${activeX}%`, top: `${activeY}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center"
                      >
                        <span className="relative flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-white shadow-xl flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5 text-accent" />
                          </span>
                        </span>
                        <span className="text-[7.5px] bg-black text-app px-1 py-0.5 font-bold uppercase tracking-widest whitespace-nowrap shadow-md mt-1 scale-90">
                          {customCoords ? 'Precise Spot' : 'Sector Center'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="text-[8.5px] text-subtle font-bold uppercase tracking-wider mt-1.5 block text-center select-none font-mono">
                  {customCoords ? '🟢 Precise map coordinates locked successfully.' : 'Click any point on the map screen above to set a custom precise spot'}
                </div>
              </div>
            }
            </div>

            <div className="rounded-xl border border-app bg-inset/40 p-3 space-y-1.5">
              <label htmlFor="pickup_address" className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Street address
              </label>
              <input
                id="pickup_address"
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="e.g. 1234 Oak St, Sacramento — optional; sent with GPS in chat"
                className="sbn-input text-xs"
                autoComplete="street-address"
              />
              <p className="text-[10px] text-muted leading-snug">
                {pickupAddress.trim()
                  ? 'Saved with this listing. Use “Send pickup location / address” in chat to share it.'
                  : 'Optional. Helpful for porch or curb pickup when combined with a GPS pin.'}
              </p>
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block font-sans">
                Photos (optional, up to {MAX_LISTING_PHOTOS})
              </span>
              <span className="text-[10px] text-subtle font-mono">{totalPhotoCount}/{MAX_LISTING_PHOTOS}</span>
            </div>

            {(savedImageUrls.length > 0 || pendingImages.length > 0) && (
              <div className="grid grid-cols-3 gap-2" id="item_image_preview_grid">
                {savedImageUrls.map((url) => (
                  <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-app bg-inset">
                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => removeSavedImage(url)}
                      className="absolute top-1 right-1 bg-black/80 hover:bg-black text-app p-1.5 rounded-full cursor-pointer"
                      title="Remove photo"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {pendingImages.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-app bg-inset">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePendingImage(img.id)}
                      className="absolute top-1 right-1 bg-black/80 hover:bg-black text-app p-1.5 rounded-full cursor-pointer"
                      title="Remove photo"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalPhotoCount < MAX_LISTING_PHOTOS && (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('item_file_input')?.click()}
                className={`border-2 border-dashed p-5 text-center cursor-pointer transition-all select-none rounded-2xl flex flex-col items-center justify-center space-y-2 ${
                  dragActive ? 'border-accent bg-accent/10' : 'border-app hover:border-accent bg-inset'
                }`}
                id="image_drag_drop_zone"
              >
                <input
                  type="file"
                  id="item_file_input"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files?.length) addImageFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <Camera className="w-6 h-6 text-muted" />
                <div className="text-xs text-muted font-bold tracking-wide">Add photos</div>
                <div className="text-[10px] text-subtle">Drag & drop or tap — PNG, JPG, WEBP</div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <label htmlFor="post_details" className="text-[10px] font-bold text-muted uppercase tracking-wider block font-sans">
              {type === 'looking' ? 'Request details' : 'Item details'}
            </label>
            <textarea
              id="post_details"
              required
              rows={4}
              maxLength={1000}
              placeholder={
                type === 'looking'
                  ? 'What you need, condition preferences, timing, etc.'
                  : 'Describe the item, condition, size, and anything helpful for neighbors.'
              }
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="block w-full p-3.5 bg-inset border border-app rounded-xl text-xs text-app placeholder:text-subtle font-semibold resize-none focus:outline-hidden"
            />
            <div className="text-right text-[10px] text-subtle font-mono font-medium">{details.length}/1000</div>
          </div>

          {/* Pickup notes */}
          <div className="space-y-1.5">
            <label htmlFor="post_pickup_notes" className="text-[10px] font-bold text-muted uppercase tracking-wider block font-sans">
              {type === 'looking' ? 'Pickup / meetup notes (optional)' : 'Pickup notes (optional)'}
            </label>
            <textarea
              id="post_pickup_notes"
              rows={3}
              maxLength={500}
              placeholder={
                type === 'looking'
                  ? 'When you can pick up, stairs, gate code to share in chat later, etc.'
                  : 'Porch instructions, best times, ring doorbell or not, curb side, etc.'
              }
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
              className="block w-full p-3.5 bg-inset border border-app rounded-xl text-xs text-app placeholder:text-subtle font-semibold resize-none focus:outline-hidden"
            />
            <div className="text-right text-[10px] text-subtle font-mono font-medium">{pickupNotes.length}/500</div>
          </div>

          {/* Guidelines info notice */}
          <div className="p-3.5 bg-accent-soft border border-accent/30 rounded-xl flex items-start space-x-2.5 text-xs text-app font-semibold" id="buy_nothing_alert">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>{RULES.postReminder}</span>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3.5 pt-2" id="post_item_actions">
            <button
              type="button"
              id="cancel_post_btn"
              onClick={onClose}
              className="flex-1 py-3 bg-inset hover:bg-surface-hover border border-app rounded-xl text-xs font-bold uppercase tracking-wider text-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit_listing_btn"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-accent hover:bg-accent-hover text-on-accent rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? isReposting
                  ? 'Reposting...'
                  : isEditing
                    ? 'Saving...'
                    : type === 'looking'
                      ? 'Posting...'
                      : 'Sharing...'
                : isReposting
                  ? 'Repost'
                  : isEditing
                    ? 'Save changes'
                    : type === 'looking'
                      ? 'Post Request'
                      : 'Share Item'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
