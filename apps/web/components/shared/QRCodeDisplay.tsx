"use client";

import React, { useMemo } from "react";
import { createQRCodeMatrix } from "@/lib/qr-generator";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
  includeLogo?: boolean;
}

export default function QRCodeDisplay({
  value,
  size = 200,
  fgColor = "#1e1b4b",
  bgColor = "#ffffff",
  className = "",
  includeLogo = true,
}: QRCodeDisplayProps) {
  const matrix = useMemo(() => {
    try {
      return createQRCodeMatrix(value);
    } catch (e) {
      console.error("QR Code Generation Error:", e);
      return [];
    }
  }, [value]);

  if (!matrix || matrix.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-400 ${className}`}
        style={{ width: size, height: size }}
      >
        QR Unavailable
      </div>
    );
  }

  const moduleCount = matrix.length;
  const padding = 2; // quiet zone in module units
  const totalModules = moduleCount + padding * 2;
  const cellSize = size / totalModules;

  // Build SVG path
  let pathData = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        const x = (c + padding) * cellSize;
        const y = (r + padding) * cellSize;
        pathData += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }

  return (
    <div
      className={`relative inline-block select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="w-full h-full rounded-2xl shadow-inner"
        style={{ backgroundColor: bgColor }}
        shapeRendering="crispEdges"
      >
        <rect width={size} height={size} fill={bgColor} rx={16} />
        <path d={pathData} fill={fgColor} />
      </svg>

      {/* Center Logo Overlay */}
      {includeLogo && (
        <div
          className="absolute inset-0 m-auto flex items-center justify-center rounded-xl bg-white shadow-md border-2 border-indigo-100 p-1"
          style={{
            width: Math.max(36, size * 0.22),
            height: Math.max(36, size * 0.22),
          }}
        >
          <img
            src="/logo.png"
            alt="SchoolVajo App"
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
