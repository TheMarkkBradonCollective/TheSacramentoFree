import { useRef, useState } from 'react';
import { BarChart3, Camera, ImagePlus, Loader2, Send, X } from 'lucide-react';
import type { UserProfile } from '../../types';
import { isLikelyImageFile, INVALID_IMAGE_FILE_MESSAGE } from '../../lib/imageUrl';
import { PresenceUserAvatar } from '../UserAvatar';

interface FeedPostComposerProps {
  userProfile: UserProfile;
  creating?: boolean;
  canCreatePoll?: boolean;
  onPublish: (input: { text: string; imageFiles: File[] }) => Promise<boolean>;
  onPublishPoll?: (input: { text: string; options: string[] }) => Promise<boolean>;
  onCancel?: () => void;
}

export default function FeedPostComposer({
  userProfile,
  creating = false,
  canCreatePoll = false,
  onPublish,
  onPublishPoll,
  onCancel,
}: FeedPostComposerProps) {
  const [mode, setMode] = useState<'post' | 'poll'>('post');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pollOptions, setPollOptions] = useState(['', '']);
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

  const resetComposer = () => {
    setText('');
    setFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setPollOptions(['', '']);
    setErr('');
  };

  const handleSubmit = async () => {
    setErr('');
    if (mode === 'poll') {
      if (!onPublishPoll) return;
      const options = pollOptions.map((option) => option.trim()).filter(Boolean);
      const ok = await onPublishPoll({ text, options });
      if (ok) resetComposer();
      return;
    }
    const ok = await onPublish({ text, imageFiles: files });
    if (ok) resetComposer();
  };

  const pollReady = text.trim().length > 0 && pollOptions.filter((option) => option.trim()).length >= 2;
  const postReady = text.trim().length > 0 || files.length > 0;

  return (
    <section className="item-feed-card sbn-feed-composer p-3 sm:p-4 space-y-3 min-w-0 overflow-hidden" id="feed_post_composer">
      <div className="flex items-center gap-2">
        <span className="sbn-badge sbn-badge-give text-[8px] px-1 py-0 leading-none whitespace-nowrap">
          {mode === 'poll' ? 'Poll' : 'Post'}
        </span>
        {canCreatePoll ? (
          <div className="inline-flex rounded-xl border border-app overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('post')}
              className={`px-2.5 py-1 text-[11px] font-bold ${mode === 'post' ? 'bg-accent text-on-accent' : 'bg-inset text-muted'}`}
            >
              Post
            </button>
            <button
              type="button"
              onClick={() => setMode('poll')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold ${mode === 'poll' ? 'bg-accent text-on-accent' : 'bg-inset text-muted'}`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Poll
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
        <PresenceUserAvatar
          uid={userProfile.uid}
          src={userProfile.photoURL}
          name={userProfile.displayName}
          size="md"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === 'poll'
                ? 'Ask neighbors a question…'
                : 'Share a thought, photo, or both with neighbors…'
            }
            rows={3}
            className="sbn-input w-full min-w-0 text-sm resize-none min-h-[4.5rem]"
            id="feed_compose_text"
          />
          {mode === 'poll' ? (
            <div className="space-y-2">
              {pollOptions.map((option, index) => (
                <input
                  key={index}
                  value={option}
                  onChange={(event) =>
                    setPollOptions((prev) => prev.map((value, i) => (i === index ? event.target.value : value)))
                  }
                  placeholder={`Choice ${index + 1}`}
                  className="sbn-input w-full min-w-0 text-sm"
                />
              ))}
              {pollOptions.length < 6 ? (
                <button
                  type="button"
                  onClick={() => setPollOptions((prev) => [...prev, ''])}
                  className="text-[11px] font-bold text-accent"
                >
                  Add another choice
                </button>
              ) : null}
            </div>
          ) : null}
          {mode === 'post' && previews.length > 0 && (
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
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-1 min-w-0">
              {onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-muted hover:text-app hover:bg-inset shrink-0"
                >
                  Cancel
                </button>
              ) : null}
              {mode === 'post' ? (
                <>
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
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border border-app bg-inset text-[11px] sm:text-xs font-bold text-muted hover:text-app hover:border-accent/40 shrink-0"
                  >
                    <ImagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border border-app bg-inset text-[11px] sm:text-xs font-bold text-muted hover:text-app hover:border-accent/40 shrink-0 sm:hidden"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Camera
                  </button>
                </>
              ) : null}
            </div>
            <button
              type="button"
              disabled={creating || (mode === 'poll' ? !pollReady : !postReady)}
              onClick={() => void handleSubmit()}
              className="inline-flex w-full sm:w-auto sm:ml-auto items-center justify-center gap-1 rounded-xl border border-accent bg-accent px-3 py-2 text-xs font-bold text-on-accent hover:bg-accent-hover disabled:opacity-50 shrink-0"
              id="feed_compose_submit"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {mode === 'poll' ? 'Post poll' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
