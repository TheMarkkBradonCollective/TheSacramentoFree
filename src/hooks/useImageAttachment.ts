import { useEffect, useState } from 'react';

/** Local image file + object-URL preview with automatic cleanup. */
export function useImageAttachment() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clear = () => setFile(null);

  return { file, previewUrl, setFile, clear };
}
