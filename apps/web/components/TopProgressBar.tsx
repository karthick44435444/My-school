"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function TopProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(40);
    const t1 = setTimeout(() => setProgress(80), 80);
    const t2 = setTimeout(() => setProgress(100), 220);
    const t3 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    let t1: NodeJS.Timeout | null = null;
    let t2: NodeJS.Timeout | null = null;

    const handleStart = () => {
      setVisible(true);
      setProgress(45);
      if (t1) clearTimeout(t1);
      t1 = setTimeout(() => setProgress(85), 100);
    };

    const handleFinish = () => {
      setProgress(100);
      if (t2) clearTimeout(t2);
      t2 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    };

    window.addEventListener("startTopLoader", handleStart);
    window.addEventListener("finishTopLoader", handleFinish);

    // Global listener on all internal navigation links for instant top progress bar response
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (target && target.href) {
        const url = new URL(target.href, window.location.origin);
        if (
          url.origin === window.location.origin &&
          url.pathname !== window.location.pathname &&
          !target.getAttribute("target") &&
          !target.getAttribute("download") &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey
        ) {
          handleStart();
        }
      }
    };
    document.addEventListener("click", handleDocumentClick, { capture: true });

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      window.removeEventListener("startTopLoader", handleStart);
      window.removeEventListener("finishTopLoader", handleFinish);
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] h-[3px] bg-transparent pointer-events-none overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-[0_0_12px_rgba(99,102,241,0.9)]"
        initial={{ width: "0%" }}
        animate={{ width: `${progress}%` }}
        transition={{ ease: "easeOut", duration: 0.2 }}
      />
    </div>
  );
}

export default function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <TopProgressBarContent />
    </Suspense>
  );
}
