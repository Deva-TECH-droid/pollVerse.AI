import React, { useState, useEffect, useRef } from 'react';

const API_URL = process.env.REACT_APP_API_URL || '';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

// Cache for player photos across component mounts to minimize network lookups
const playerPhotoCache = new Map();

export function resolvePhotoUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_URL}${url}`;
}

export function getPlayerColor(name) {
  if (!name) return '#6366f1';
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getPlayerInitials(name) {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function PlayerAvatar({
  name,
  photoUrl,
  size = 40,
  variant = 'default', // 'default' | 'cutout' | 'card' | 'mini'
  allowUpload = false,
  onPhotoUploaded,
  getToken,
  className = '',
  style = {},
  showName = false,
}) {
  const [currentPhoto, setCurrentPhoto] = useState(photoUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef(null);

  // Sync state if photoUrl prop changes
  useEffect(() => {
    if (photoUrl) {
      setCurrentPhoto(photoUrl);
      setImgError(false);
      if (name) playerPhotoCache.set(name.trim().toLowerCase(), photoUrl);
    } else if (name) {
      const cached = playerPhotoCache.get(name.trim().toLowerCase());
      if (cached) {
        setCurrentPhoto(cached);
        setImgError(false);
      } else {
        // Auto-fetch permanent photo if missing
        fetch(`${API_URL}/api/gully-cricket/profiles/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerNames: [name] }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            const found = data?.players?.[name.trim().toLowerCase()];
            if (found) {
              playerPhotoCache.set(name.trim().toLowerCase(), found);
              setCurrentPhoto(found);
              setImgError(false);
            }
          })
          .catch(() => {});
      }
    }
  }, [name, photoUrl]);

  const handleUploadClick = (e) => {
    if (!allowUpload) return;
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !name) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      alert('Only JPG, JPEG, PNG, and WebP images are supported.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(`Image exceeds 2MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    setIsUploading(true);
    try {
      let token = '';
      if (getToken) {
        try {
          token = await getToken();
        } catch (_) {}
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'players');

      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const upRes = await fetch(`${API_URL}/api/gully-cricket/upload?type=players`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!upRes.ok) throw new Error('Upload failed');
      const upData = await upRes.json();
      const uploadedUrl = upData.url;

      // Persist permanently in PlayerProfile
      await fetch(`${API_URL}/api/gully-cricket/players/photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          photoUrl: uploadedUrl,
        }),
      });

      playerPhotoCache.set(name.trim().toLowerCase(), uploadedUrl);
      setCurrentPhoto(uploadedUrl);
      setImgError(false);
      if (onPhotoUploaded) onPhotoUploaded(uploadedUrl);
    } catch (err) {
      alert(err.message || 'Could not save player photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const initials = getPlayerInitials(name);
  const bgColor = getPlayerColor(name);
  const resolvedUrl = currentPhoto && !imgError ? resolvePhotoUrl(currentPhoto) : null;

  // Variant styling
  const isCutout = variant === 'cutout';

  const avatarContainerStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: isCutout ? '50%' : '50%',
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: allowUpload ? 'pointer' : 'default',
    background: resolvedUrl
      ? isCutout
        ? 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, rgba(15, 23, 42, 0.6) 80%)'
        : 'rgba(0,0,0,0.2)'
      : bgColor,
    border: isCutout
      ? '2px solid rgba(0, 255, 102, 0.6)'
      : '1.5px solid rgba(255, 255, 255, 0.15)',
    boxShadow: isCutout
      ? '0 0 12px rgba(0, 255, 102, 0.35), inset 0 0 8px rgba(0, 255, 102, 0.2)'
      : '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'all 0.2s ease',
    ...style,
  };

  return (
    <div
      className={`pv-player-avatar-wrap ${isCutout ? 'pv-avatar-cutout' : ''} ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      title={allowUpload ? `Click to upload/change photo for ${name || 'Player'}` : name}
      onClick={allowUpload ? handleUploadClick : undefined}
    >
      <div style={avatarContainerStyle} className="pv-avatar-circle">
        {resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt={name || 'Player'}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              filter: isCutout ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.5)) contrast(1.05)' : 'none',
              transform: isCutout ? 'scale(1.04)' : 'none',
            }}
          />
        ) : (
          <span
            style={{
              color: '#ffffff',
              fontWeight: 800,
              fontSize: Math.max(size * 0.38, 10),
              letterSpacing: '0.5px',
              userSelect: 'none',
            }}
          >
            {initials}
          </span>
        )}

        {/* Hover / Upload Overlay */}
        {allowUpload && (
          <div
            className="pv-avatar-upload-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isUploading ? 1 : 0,
              transition: 'opacity 0.2s',
              fontSize: size * 0.36,
            }}
          >
            {isUploading ? '⏳' : '📷'}
          </div>
        )}

        {allowUpload && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        )}
      </div>

      {showName && name && (
        <span className="pv-avatar-label-name" style={{ fontWeight: 600 }}>
          {name}
        </span>
      )}
    </div>
  );
}
