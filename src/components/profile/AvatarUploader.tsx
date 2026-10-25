'use client';

import React, { useState, useRef } from 'react';
import { Upload, Camera, Check, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import { R2UploadService } from '@/lib/storage/uploadService';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

interface AvatarUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarUpdated?: (newUrl: string) => void;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  isOpen,
  onClose,
  onAvatarUpdated,
}) => {
  const { user, profile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WEBP, or GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      setError('Please choose an image to upload.');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Direct browser-to-Cloudflare R2 upload via presigned URL
      const publicUrl = await R2UploadService.uploadAvatar(
        selectedFile,
        user.uid,
        (pct) => setProgress(pct)
      );

      // 2. Persist avatar URL into Firestore user profile
      await FirestoreService.updateUserAvatar(user.uid, publicUrl);

      setSuccess(true);
      if (onAvatarUpdated) {
        onAvatarUpdated(publicUrl);
      }

      // Auto close after brief success message
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedFile(null);
        setPreviewUrl(null);
      }, 1500);
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setError(err?.message || 'Failed to upload avatar to Cloudflare R2.');
    } finally {
      setIsUploading(false);
    }
  };

  const currentDisplayAvatar = previewUrl || profile?.avatar;
  const isImageAvatar = currentDisplayAvatar && currentDisplayAvatar.startsWith('http');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#22201d] border-2 border-[#35322b] rounded-3xl p-6 sm:p-7 shadow-[0_12px_0_0_#141311] text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full border-2 border-[#35322b] bg-[#1a1815] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-amber-500/20 border-2 border-amber-500/40 rounded-2xl text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Profile Avatar</h2>
            <p className="text-xs text-zinc-400 font-medium">
              Upload a picture for your profile
            </p>
          </div>
        </div>

        {/* Avatar Preview */}
        <div className="flex flex-col items-center justify-center py-3">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-3xl overflow-hidden bg-[#1a1815] border-2 border-dashed border-[#4d483f] group-hover:border-emerald-500 transition-all flex items-center justify-center shadow-inner">
              {isImageAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentDisplayAvatar}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl">{currentDisplayAvatar || '♟️'}</span>
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-black gap-1 text-white">
              <Camera className="w-5 h-5 text-amber-400" />
              <span>Change</span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 font-medium mt-3 text-center">
            Supports JPG, PNG, WEBP, or GIF (max 5 MB).
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Progress Bar */}
        {isUploading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-400 font-bold mb-1.5">
              <span>Uploading to R2...</span>
              <span className="font-mono text-emerald-400 font-black">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-[#1a1815] border-2 border-[#35322b] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 mb-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2 shadow-[0_3px_0_0_#881337]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="p-3 mb-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-2 shadow-[0_3px_0_0_#14532d]">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Avatar saved successfully!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <Button
            type="button"
            variant="secondary"
            size="md"
            rounded="full"
            fullWidth
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4" />
            <span>Select File</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            rounded="full"
            fullWidth
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Avatar</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
