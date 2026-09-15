"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Loader2, Crop, Move } from "lucide-react";

interface ImageCropModalProps {
  open: boolean;
  imageFile: File | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => Promise<void> | void;
  title?: string;
  themeColor?: string;
}

const CROP_BOX_SIZE = 300; // 300px x 300px square crop window (1:1)
const OUTPUT_SIZE = 512;   // 512px x 512px high resolution export

export default function ImageCropModal({
  open,
  imageFile,
  onClose,
  onCropComplete,
  title = "Crop Profile Picture",
  themeColor = "#6366F1",
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0); // 0% to 100% zoom (0% = full size cover, no extra background)
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load image preview when imageFile changes
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(0);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgDimensions({ width: naturalWidth, height: naturalHeight });
    setZoom(0);
    setPan({ x: 0, y: 0 });
  };

  // Calculate base scale to perfectly cover the 1:1 crop box at 0% zoom
  const isRotated = rotation % 180 !== 0;
  const naturalW = isRotated ? imgDimensions.height : imgDimensions.width;
  const naturalH = isRotated ? imgDimensions.width : imgDimensions.height;
  const coverScale =
    naturalW > 0 && naturalH > 0
      ? Math.max(CROP_BOX_SIZE / naturalW, CROP_BOX_SIZE / naturalH)
      : 1;

  // Zoom scale: 0% = coverScale (no extra background), 100% = 3x coverScale
  const currentScale = coverScale * (1 + (zoom / 100) * 2.0);

  // Mouse / Touch Drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.08;
    setZoom((prev) => Math.min(Math.max(0, prev + delta), 100));
  };

  const rotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetAll = () => {
    setZoom(0);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Perform Canvas 1:1 Crop
  const handleCrop = async () => {
    if (!imageRef.current || !imageFile) return;
    setProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      const img = imageRef.current;
      const rad = (rotation * Math.PI) / 180;

      // Fill canvas background with clean white fallback
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // Scale factor from Crop Box (300px) to Output (512px)
      const scaleMultiplier = OUTPUT_SIZE / CROP_BOX_SIZE;

      ctx.save();
      // Center of canvas
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.translate(pan.x * scaleMultiplier, pan.y * scaleMultiplier);
      ctx.rotate(rad);
      ctx.scale(currentScale * scaleMultiplier, currentScale * scaleMultiplier);

      // Draw image centered at origin
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setProcessing(false);
            return;
          }
          const baseName = (imageFile.name || "profile").replace(/\.[^/.]+$/, "");
          const croppedFile = new File([blob], `${baseName}_1x1.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          await onCropComplete(croppedFile);
          setProcessing(false);
          onClose();
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Cropping error:", err);
      setProcessing(false);
    }
  };

  if (!open || !imageFile) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Crop className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-none">
                  {title}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  1:1 Square Profile Aspect Ratio
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={processing}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Crop Viewport Box */}
          <div className="p-6 flex flex-col items-center bg-slate-900/5">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              style={{ width: CROP_BOX_SIZE, height: CROP_BOX_SIZE }}
              className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-inner cursor-grab active:cursor-grabbing select-none border-2 border-slate-700/50"
            >
              {/* Render Image with Transform */}
              {imageSrc && (
                <div
                  className="w-full h-full flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${currentScale})`,
                    transformOrigin: "center center",
                    transition: isDragging ? "none" : "transform 0.05s ease-out",
                  }}
                >
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="crop target"
                    onLoad={onImageLoad}
                    className="max-w-none pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              )}

              {/* 1:1 Circular Guide & Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none border border-white/20">
                {/* Circular Profile Mask Guide */}
                <div className="w-full h-full rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                {/* Center Crosshair / Grid */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-full h-[1px] bg-white" />
                  <div className="h-full w-[1px] bg-white absolute" />
                </div>
              </div>

              {/* Drag Hint Overlay */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 pointer-events-none bg-black/40 backdrop-blur-xs py-1 px-2.5 rounded-lg">
                <Move className="w-3 h-3 text-white/80" />
                <span className="text-[10px] text-white/90 font-medium">
                  Drag to move · Scroll to zoom
                </span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="w-full mt-4 space-y-3">
              {/* Zoom Slider (0% to 100%) */}
              <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0, z - 10))}
                  className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value) || 0)}
                  className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(100, z + 10))}
                  className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-bold text-slate-500 w-10 text-right">
                  {Math.round(zoom)}%
                </span>
              </div>

              {/* Action Buttons: Rotate & Reset */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={rotateClockwise}
                  className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rotate 90°</span>
                </button>

                <button
                  type="button"
                  onClick={resetAll}
                  className="py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCrop}
              disabled={processing}
              style={{ backgroundColor: themeColor }}
              className="px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-95 transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Crop & Apply</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
