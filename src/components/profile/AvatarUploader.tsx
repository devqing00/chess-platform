'use client';

import React, { useState, useRef } from 'react';
import { Upload, Camera, Check, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import { R2UploadService } from '@/lib/storage/uploadService';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import { useAuth } from '@/context/AuthContext';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#262421] border border-[#3d3a34] rounded-2xl p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#322f2b] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Profile Avatar</h2>
            <p className="text-xs text-zinc-400">
              Cloudflare R2 Powered &bull; 100% Free CDN Egress
            </p>
          </div>
        </div>

        {/* Avatar Preview */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-[#1c1a17] border-2 border-dashed border-zinc-600 group-hover:border-amber-400 transition-all flex items-center justify-center shadow-inner">
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
            <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-semibold gap-1 text-white">
              <Camera className="w-5 h-5" />
              <span>Change</span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mt-3 text-center">
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
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Uploading to R2...</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-[#1c1a17] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Avatar saved successfully!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 py-2.5 px-4 bg-[#322f2b] hover:bg-[#3d3a34] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>Select File</span>
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex-1 py-2.5 px-4 bg-[#81b64c] hover:bg-[#92c855] text-black text-xs font-black rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Avatar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
