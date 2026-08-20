import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Send, X } from 'lucide-react';
import type { UserProfile } from '../../types';
import { isLikelyImageFile, INVALID_IMAGE_FILE_MESSAGE } from '../../lib/imageUrl';

interface FeedPostComposerProps {
  userProfile: UserProfile;
  creating?: boolean;
  onPublish: (input: { text: string; imageFiles: File[] }) => Promise<boolean>;
}

export default function FeedPostComposer({ userProfile, creating = false, onPublish }: FeedPostComposerProps) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const next: File[] = [];
    const nextPreviews: string[] = [];
    for (const file of Array.from(incoming)) {
      if (!isLikelyImageFile(file)) {
        setErr(INVALID_IMAGE_FILE_MESSAGE);
        continue;
      }
      if (files.length + next.length >= 4) break;
      next.push(file);
      nextPreviews.push(URL.createObjectURL(file));
    }
    if (next.length) {
      setFiles((prev) => [...prev, ...next].slice(0, 4));
      setPreviews((prev) => [...prev, ...nextPreviews].slice(0, 4));
      setErr('');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    setErr('');
    const ok = await onPublish({ text, imageFiles: files });
    if (ok) {
      setText('');
      setFiles([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
    }
  };

  return (
    <section className="sbn-feed-composer sbn-card p-4 space-y-3" id="feed_post_composer">
      <div className="flex items-start gap-3">
        <img
          src={
            userProfile.photoURL ||
            `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile.displayName)}`
          }
          alt=""
          className="w-10 h-10 rounded-full border border-app shrink-0 object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a thought, photo, or both with neighbors…"
            rows={3}
            className="sbn-input w-full text-sm resize-none min-h-[4.5rem]"
            id="feed_compose_text"
          />
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((src, index) => (
                <div key={src} className="relative">
                  <img src={src} alt="" className="h-20 w-20 rounded-xl object-cover border border-app" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-surface border border-app text-muted hover:text-app"
                    aria-label="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-app hover:bg-inset"
              >
                <ImagePlus className="w-4 h-4" />
                Photo
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-app hover:bg-inset md:hidden"
              >
                <Camera className="w-4 h-4" />
                Camera
              </button>
            </div>
            <button
              type="button"
              disabled={creating || (!text.trim() && files.length === 0)}
              onClick={() => void handleSubmit()}
              className="sbn-btn sbn-btn-primary sbn-btn-sm inline-flex items-center gap-1.5"
              id="feed_compose_submit"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
