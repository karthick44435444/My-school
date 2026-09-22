"use client";

import { useEffect, useState, useRef } from "react";

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
  const cleanUrl = (photoUrl || "").trim().replace(/^['"]+|['"]+$/g, "");
  const isDataOrBlob = cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:");
  const [loading, setLoading] = useState(Boolean(cleanUrl) && !isDataOrBlob);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const initial = (name || "?").charAt(0).toUpperCase();
  const isFullSize = className.includes("w-full") || className.includes("h-full");
  const style = isFullSize ? undefined : { width: size, height: size, minWidth: size };

  useEffect(() => {
    setImgError(false);
    if (cleanUrl) {
      if (isDataOrBlob) {
        setLoading(false);
      } else if (imgRef.current && imgRef.current.complete) {
        setLoading(false);
      } else {
        setLoading(true);
      }
    } else {
      setLoading(false);
    }
  }, [cleanUrl, isDataOrBlob]);

  let src: string | null = null;
  if (!imgError && cleanUrl && cleanUrl !== "null" && cleanUrl !== "undefined") {
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(cleanUrl)) {
      src = cleanUrl.replace(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/, "");
    } else if (cleanUrl.startsWith("http") || cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:")) {
      src = cleanUrl;
    } else if (cleanUrl.startsWith("/")) {
      src = cleanUrl;
    } else {
      src = `/${cleanUrl}`;
    }
  }

  if (src && !imgError) {
    return (
      <div style={style} className={`relative rounded-full overflow-hidden shrink-0 ${className}`}>
        {loading && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse rounded-full flex items-center justify-center pointer-events-none">
            <span className="text-slate-400 font-bold" style={{ fontSize: Math.max(10, size * 0.35) }}>
              {initial}
            </span>
          </div>
        )}
        <img
          ref={imgRef}
          src={src}
          alt={name || "Avatar"}
          style={style}
          onLoad={() => setLoading(false)}
          onError={() => {
            setImgError(true);
            setLoading(false);
          }}
          className={`w-full h-full rounded-full object-cover transition-opacity duration-150 ${loading ? "opacity-0" : "opacity-100"}`}
        />
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold select-none shrink-0 ${className}`}
    >
      <span style={{ fontSize: Math.max(12, size * 0.4) }}>{initial}</span>
    </div>
  );
}

