"use client";

import { useEffect, useState } from "react";

export default function Avatar({
  name,
  photoUrl,
  size = 36,
  className = "",
}: {
  name?: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(Boolean(photoUrl));
  const initial = (name || "?").charAt(0).toUpperCase();
  const isFullSize = className.includes("w-full") || className.includes("h-full");
  const style = isFullSize ? undefined : { width: size, height: size, minWidth: size };

  useEffect(() => {
    setImgError(false);
    if (photoUrl) setLoading(true);
  }, [photoUrl]);

  const cleanUrl = (photoUrl || "").trim();
  let src: string | null = null;
  if (!imgError && cleanUrl) {
    if (cleanUrl.startsWith("http") || cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:")) {
      src = cleanUrl;
    } else if (cleanUrl.startsWith("/")) {
      src = cleanUrl;
    } else {
      src = `/${cleanUrl}`;
    }
  }

  if (src) {
    return (
      <div style={style} className={`relative rounded-full overflow-hidden shrink-0 ${className}`}>
        {loading && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse rounded-full flex items-center justify-center">
            <span className="text-slate-400 font-bold" style={{ fontSize: Math.max(10, size * 0.35) }}>
              {initial}
            </span>
          </div>
        )}
        <img
          src={src}
          alt={name || "Avatar"}
          style={style}
          onLoad={() => setLoading(false)}
          onError={() => {
            setImgError(true);
            setLoading(false);
          }}
          className={`w-full h-full rounded-full object-cover transition-opacity duration-200 ${loading ? "opacity-0" : "opacity-100"}`}
        />
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold select-none ${className}`}
    >
      <span style={{ fontSize: Math.max(12, size * 0.4) }}>{initial}</span>
    </div>
  );
}
