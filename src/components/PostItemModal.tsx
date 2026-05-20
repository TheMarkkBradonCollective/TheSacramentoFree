import React, { useState } from 'react';
import { SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, ISO_CATEGORIES, ISO_DELIVERY_PREFS, PostType, mapGPSToPercent } from '../types';
import { createSupabaseItem, uploadItemImage } from '../supabase';
import { X, Gift, Search, Info, Camera, Trash2, Navigation, Map, MapPin } from 'lucide-react';
import { UserProfile, ItemPost } from '../types';

// Neighborhood center coordinates as percentages (0-100) of our map sandbox
const NEIGHBORHOOD_COORDS: Record<string, { x: number; y: number }> = {
  'Natomas': { x: 48, y: 16 },
  'Arden': { x: 74, y: 25 },
  'Citrus Heights': { x: 90, y: 10 },
  'Rancho Cordova': { x: 90, y: 45 },
  'East Sacramento': { x: 64, y: 38 },
  'Midtown': { x: 53, y: 40 },
  'Downtown': { x: 41, y: 40 },
  'West Sacramento': { x: 22, y: 40 },
  'Land Park': { x: 38, y: 56 },
  'Curtis Park': { x: 50, y: 55 },
  'Oak Park': { x: 63, y: 56 },
  'Tahoe Park': { x: 75, y: 56 },
  'Pocket-Greenhaven': { x: 24, y: 72 },
  'South Sacramento': { x: 55, y: 74 },
  'Elk Grove': { x: 58, y: 91 }
};

// Approximate real Lat/Lng center points across Sacramento
const NEIGHBORHOOD_LAT_LONGS: Record<string, { lat: number; lng: number }> = {
  'Natomas': { lat: 38.6368, lng: -121.5034 },
  'Arden': { lat: 38.6013, lng: -121.3916 },
  'Citrus Heights': { lat: 38.7071, lng: -121.2811 },
  'Rancho Cordova': { lat: 38.5891, lng: -121.3027 },
  'East Sacramento': { lat: 38.5674, lng: -121.4429 },
  'Midtown': { lat: 38.5724, lng: -121.4784 },
  'Downtown': { lat: 38.5816, lng: -121.4944 },
  'West Sacramento': { lat: 38.5805, lng: -121.5302 },
  'Land Park': { lat: 38.5432, lng: -121.4975 },
  'Curtis Park': { lat: 38.5484, lng: -121.4795 },
  'Oak Park': { lat: 38.5447, lng: -121.4614 },
  'Tahoe Park': { lat: 38.5455, lng: -121.4326 },
  'Pocket-Greenhaven': { lat: 38.4907, lng: -121.5365 },
  'South Sacramento': { lat: 38.4952, lng: -121.4468 },
  'Elk Grove': { lat: 38.4088, lng: -121.3716 }
};

const findClosestNeighborhood = (lat: number, lng: number): string => {
  let minDistance = Infinity;
  let closest = 'Midtown';
  
  for (const [name, coords] of Object.entries(NEIGHBORHOOD_LAT_LONGS)) {
    const dLat = lat - coords.lat;
    const dLng = lng - coords.lng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng); // Euclidean approximation
    if (distance < minDistance) {
      minDistance = distance;
      closest = name;
    }
  }
  return closest;
};

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

  // GPS and Map selection utility state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [customCoords, setCustomCoords] = useState<{ x: number; y: number } | null>(null);

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
        const { latitude, longitude } = position.coords;
        const coords = mapGPSToPercent(latitude, longitude);
        setCustomCoords(coords);
        const closest = findClosestNeighborhood(latitude, longitude);
        setNeighborhood(closest);
        setGpsStatus(`Detected precise GPS: ${coords.x.toFixed(1)}%, ${coords.y.toFixed(1)}% inside ${closest.toUpperCase()} Sector 🟢`);
        setGpsLoading(false);
        setShowMiniMap(true);
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
    const gpsSuffix = customCoords ? `\n\n[GPS: ${customCoords.x.toFixed(2)},${customCoords.y.toFixed(2)}]` : '';
    const finalDescription = (type === 'looking' 
      ? `[TRANSPORT: ${collectionMethod}]\n\n${description.trim()}`
      : description.trim()) + gpsSuffix;

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
    <div id="post_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 overflow-y-auto font-sans">
      <div className="relative w-full max-w-md bg-[#1A1A1B] rounded-2xl border border-[#343536] shadow-2xl overflow-hidden my-8" id="post_modal_box">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#343536] bg-[#0B0C0D]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#FF4500] text-white rounded-xl flex items-center justify-center">
              {type === 'looking' ? <Search className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight font-display">
              {type === 'looking' ? 'Post a New Request (ISO)' : 'Share a New Gift'}
            </h3>
          </div>
          <button
            id="close_modal_btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252526] rounded-xl transition-colors cursor-pointer"
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

          {/* Type Toggle (Giveaway vs Looking for) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">What kind of post is this?</span>
            <div className="grid grid-cols-2 gap-3.5" id="listing_type_grid">
              <button
                type="button"
                id="type_giveaway_btn"
                onClick={() => setType('giveaway')}
                className={`py-3 px-4 rounded-xl text-xs font-bold border uppercase tracking-wider transition-all inline-flex items-center justify-center space-x-2 cursor-pointer ${
                  type === 'giveaway'
                    ? 'bg-[#FF4500] border-[#FF4500] text-white shadow-xs'
                    : 'bg-[#0F0F0F] border-[#343536] text-zinc-300 hover:bg-[#252526]'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Giving Away</span>
              </button>

              <button
                type="button"
                id="type_looking_btn"
                onClick={() => setType('looking')}
                className={`py-3 px-4 rounded-xl text-xs font-bold border uppercase tracking-wider transition-all inline-flex items-center justify-center space-x-2 cursor-pointer ${
                  type === 'looking'
                    ? 'bg-[#FF4500] border-[#FF4500] text-white shadow-xs'
                    : 'bg-[#0F0F0F] border-[#343536] text-zinc-300 hover:bg-[#252526]'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Looking For (ISO)</span>
              </button>
            </div>
          </div>

          {/* Item Title */}
          <div className="space-y-1.5">
            <label htmlFor="post_title" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              {type === 'looking' ? 'What are you looking for? (ISO Request)' : 'What are you sharing?'}
            </label>
            <input
              type="text"
              id="post_title"
              required
              placeholder={type === 'looking' ? "e.g., Lawn mower to borrow, Baby blankets, Canned food..." : "e.g., Solid Walnut Dresser, Garden soil..."}
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full px-3.5 py-3 bg-[#0F0F0F] border border-[#343536] rounded-xl text-xs text-white font-semibold focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors focus:outline-hidden"
            />
          </div>

          {type === 'giveaway' ? (
            /* Category selection */
            <div className="space-y-1.5" id="post_category_section">
              <label htmlFor="post_category" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block font-bold">Sector Category</label>
              <select
                id="post_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-3.5 py-3 bg-[#0F0F0F] border border-[#343536] rounded-xl text-xs font-bold text-white cursor-pointer focus:border-[#FF4500] focus:outline-hidden uppercase"
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#1A1A1B] text-white">{c.toUpperCase()}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-4 font-sans" id="post_looking_custom_fields">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Seeking Category */}
                <div className="space-y-1.5">
                  <label htmlFor="post_iso_category" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block font-bold">Category of Need</label>
                  <select
                    id="post_iso_category"
                    value={isoCategory}
                    onChange={(e) => setIsoCategory(e.target.value)}
                    className="block w-full px-3.5 py-3 bg-[#0F0F0F] border border-[#343536] rounded-xl text-xs font-bold text-white cursor-pointer focus:border-[#FF4500] focus:outline-hidden uppercase"
                  >
                    {ISO_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#1A1A1B] text-white select-dark-opt">{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Transit preference */}
                <div className="space-y-1.5">
                  <label htmlFor="post_collection_method" className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block font-bold">Transit arrangement</label>
                  <select
                    id="post_collection_method"
                    value={collectionMethod}
                    onChange={(e) => setCollectionMethod(e.target.value)}
                    className="block w-full px-3.5 py-3 bg-[#0F0F0F] border border-[#343536] rounded-xl text-xs font-bold text-white cursor-pointer focus:border-[#FF4500] focus:outline-hidden uppercase"
                  >
                    {ISO_DELIVERY_PREFS.map((m) => (
                      <option key={m} value={m} className="bg-[#1A1A1B] text-white select-dark-opt">{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Unified Location Selector Sector */}
          <div className="space-y-2 border-t border-[#343536] pt-4" id="post_location_coordinates_section">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block font-mono">Exchange Sector (Pick-up Location)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  id="post_final_neighborhood"
                  value={neighborhood}
                  onChange={(e) => {
                    setNeighborhood(e.target.value);
                    setGpsStatus('');
                  }}
                  className="block w-full px-3.5 py-3 bg-[#0F0F0F] border border-[#343536] rounded-xl text-xs font-bold text-white cursor-pointer focus:border-[#FF4500] focus:outline-hidden uppercase"
                >
                  {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                    <option key={`unified_neigh_${n}`} value={n} className="bg-[#1A1A1B] text-white select-dark-opt">{n.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* GPS Button */}
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={gpsLoading}
                title="Detect current location via GPS"
                className="px-3.5 bg-[#0F0F0F] hover:bg-[#252526] border border-[#343536] rounded-xl text-zinc-300 flex items-center justify-center cursor-pointer transition-all select-none disabled:opacity-50"
              >
                <Navigation className={`w-4 h-4 text-zinc-300 ${gpsLoading ? 'animate-spin text-[#FF4500]' : ''}`} />
              </button>

              {/* Map Button */}
              <button
                type="button"
                onClick={() => setShowMiniMap(!showMiniMap)}
                title="Pinpoint neighborhood on interactive district map"
                className={`px-3.5 border rounded-xl flex items-center justify-center cursor-pointer transition-all select-none ${
                  showMiniMap
                    ? 'bg-[#FF4500] border-[#FF4500] text-white'
                    : 'bg-[#0F0F0F] hover:bg-[#252526] border-[#343536] text-zinc-300'
                }`}
              >
                <Map className="w-4 h-4 text-current" />
              </button>
            </div>

            {/* GPS Feedback text */}
            {gpsStatus && (
              <p className="text-[9.5px] font-black text-zinc-400 tracking-wider uppercase flex items-center gap-1.5 mt-1 font-mono">
                <span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full inline-block animate-ping"></span>
                {gpsStatus}
              </p>
            )}

            {/* Micro Sacramento Map Picker */}
            {showMiniMap &&
              <div className="border border-[#343536] bg-[#0F0F0F] p-2 mt-2 select-none relative rounded-xl" id="sac_mini_map_picker_container">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#343536] mb-2">
                  <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest font-mono">Sacramento District map Grid</span>
                  <span className="text-[9px] font-extrabold text-[#FF4500] uppercase font-mono">{neighborhood.toUpperCase()} SECTOR</span>
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
                  className="relative w-full aspect-video bg-[#0A0A0B] border border-[#343536] overflow-hidden cursor-crosshair rounded-lg" 
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

                  {/* Neighborhood label dots / references */}
                  {Object.entries(NEIGHBORHOOD_COORDS).map(([name, pos]) => {
                    const isSelected = neighborhood === name;
                    return (
                      <div
                        key={`mini_pos_${name}`}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#FF4500] scale-125' : 'bg-zinc-700'} opacity-75`} />
                        <span className="text-[6px] tracking-widest text-[#FF4500] font-bold uppercase whitespace-nowrap block mt-0.5 scale-90">
                          {name}
                        </span>
                      </div>
                    );
                  })}

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
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4500] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-white shadow-xl flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5 text-[#FF4500]" />
                          </span>
                        </span>
                        <span className="text-[7.5px] bg-black text-white px-1 py-0.5 font-bold uppercase tracking-widest whitespace-nowrap shadow-md mt-1 scale-90">
                          {customCoords ? 'Precise Spot' : 'Sector Center'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="text-[8.5px] text-zinc-550 font-bold uppercase tracking-wider mt-1.5 block text-center select-none font-mono">
                  {customCoords ? '🟢 Precise map coordinates locked successfully.' : 'Click any point on the map screen above to set a custom precise spot'}
                </div>
              </div>
            }
          </div>

          {/* Picture Upload Box */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">Add a Photo (Optional)</span>
            
            {imagePreview ? (
              <div className="relative border border-[#343536] bg-[#0F0F0F] p-2 rounded-2xl text-center" id="item_image_preview_container">
                <img
                  src={imagePreview}
                  alt="Item Preview"
                  className="max-h-48 mx-auto object-cover border border-[#343536] rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  id="remove_preview_btn"
                  className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white p-2 rounded-full transition-colors cursor-pointer"
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
                className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all select-none rounded-2xl flex flex-col items-center justify-center space-y-2 ${
                  dragActive ? 'border-[#FF4500] bg-[#FF4500]/10' : 'border-[#343536] hover:border-[#FF4500] bg-[#0F0F0F]'
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
                <Camera className="w-6 h-6 text-zinc-400 group-hover:text-[#FF4500] transition-colors" />
                <div className="text-xs text-zinc-300 font-bold tracking-wide">
                  Drag & Drop or Click to Upload
                </div>
                <div className="text-[10px] text-zinc-500 font-sans tracking-tight">
                  PNG, JPG, OR WEBP (UP TO 5MB)
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="post_description" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">
              {type === 'looking' ? 'Request Details & Context' : 'Details & Pickup Notes'}
            </label>
            <textarea
              id="post_description"
              required
              rows={4}
              maxLength={1000}
              placeholder={type === 'looking' ? "Describe what you are looking for, why you need it, and your transit arrangement flexibility." : "Describe the item, its condition, and how neighbors can pick it up (like contactless porch pickup)."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full p-3.5 bg-[#0F0F0F] border border-[#343536] rounded-xl text-xs text-white placeholder-zinc-500 font-semibold resize-none focus:outline-hidden"
            />
            <div className="text-right text-[10px] text-zinc-500 font-mono font-medium">
              {description.length}/1000 chars
            </div>
          </div>

          {/* Guidelines info notice */}
          <div className="p-3.5 bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-xl flex items-start space-x-2.5 text-xs text-white font-semibold" id="buy_nothing_alert">
            <Info className="w-4 h-4 text-[#FF4500] shrink-0 mt-0.5" />
            <span>
              <strong>Everything is 100% free:</strong> Absolutely no selling, trades, or money allowed. Everything shared here is a pure gift!
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3.5 pt-2" id="post_item_actions">
            <button
              type="button"
              id="cancel_post_btn"
              onClick={onClose}
              className="flex-1 py-3 bg-[#0F0F0F] hover:bg-[#252526] border border-[#343536] rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit_listing_btn"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#FF4500] hover:bg-[#E03D00] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting 
                ? (type === 'looking' ? 'Posting...' : 'Sharing...') 
                : (type === 'looking' ? 'Post Request' : 'Share Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
