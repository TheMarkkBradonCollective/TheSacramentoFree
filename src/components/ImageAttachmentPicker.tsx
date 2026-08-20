import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { INVALID_IMAGE_FILE_MESSAGE, normalizeImageUploadFile } from '../lib/imageUrl';

interface ImageAttachmentPickerProps {
  label?: string;
  hint?: string;
  file: File | null;
  previewUrl: string | null;
  onChange: (file: File | null) => void;
  onInvalidFile?: (message: string) => void;
  disabled?: boolean;
}

export default function ImageAttachmentPicker({
  label = 'Attach a photo (optional)',
  hint,
  file,
  previewUrl,
  onChange,
  onInvalidFile,
  disabled = false,
}: ImageAttachmentPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onChange(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-bold uppercase text-muted block">{label}</span>
      {hint && <p className="text-[11px] text-muted leading-snug">{hint}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          const normalized = normalizeImageUploadFile(picked);
          if (picked && !normalized) {
            onInvalidFile?.(INVALID_IMAGE_FILE_MESSAGE);
            e.target.value = '';
            return;
          }
          onChange(normalized);
        }}
      />
      {previewUrl ? (
        <div className="relative rounded-xl border border-app overflow-hidden bg-inset">
          <img src={previewUrl} alt={file?.name || 'Attachment preview'} className="w-full max-h-48 object-contain" />
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Remove photo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="sbn-btn sbn-btn-secondary w-full text-sm"
        >
          <Camera className="w-4 h-4" />
          Add photo
        </button>
      )}
    </div>
  );
}
