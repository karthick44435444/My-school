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
  const initial = (name || "?").charAt(0).toUpperCase();
  const isFullSize = className.includes("w-full") || className.includes("h-full");
  const style = isFullSize ? undefined : { width: size, height: size, minWidth: size };

  useEffect(() => {
    setImgError(false);
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
      <img
        src={src}
        alt={name || "Avatar"}
        style={style}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover bg-slate-100 ${className}`}
      />
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
