'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface MouseCoordinateSample {
  x: number;
  y: number;
  timestamp: number;
}

export interface AntiCheatTelemetryData {
  tabBlurCount: number;
  totalBlurTimeMs: number;
  clipboardPasteCount: number;
  mouseLinearityScore: number; // 0 (pure human curve/jitter) to 1.0 (unnatural robotic straight line)
  moveTimingsMs: number[];
}

export function useAntiCheatTelemetry() {
  const [tabBlurCount, setTabBlurCount] = useState(0);
  const [totalBlurTimeMs, setTotalBlurTimeMs] = useState(0);
  const [clipboardPasteCount, setClipboardPasteCount] = useState(0);

  const blurStartRef = useRef<number | null>(null);
  const mouseSamplesRef = useRef<MouseCoordinateSample[]>([]);
  const moveTimingsRef = useRef<number[]>([]);
  const lastMoveTimeRef = useRef<number>(Date.now());

  // 1. Tab Blur & Visibility Tracking
  useEffect(() => {
    const handleBlur = () => {
      setTabBlurCount((prev) => prev + 1);
      blurStartRef.current = Date.now();
    };

    const handleFocus = () => {
      if (blurStartRef.current) {
        const duration = Date.now() - blurStartRef.current;
        setTotalBlurTimeMs((prev) => prev + duration);
        blurStartRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    const handlePaste = () => {
      setClipboardPasteCount((prev) => prev + 1);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // 2. Mouse Trajectory Linearity & Jitter Sampling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Throttle sampling to ~20ms
      const now = Date.now();
      const last = mouseSamplesRef.current[mouseSamplesRef.current.length - 1];
      if (!last || now - last.timestamp > 20) {
        mouseSamplesRef.current.push({ x: e.clientX, y: e.clientY, timestamp: now });
        // Keep window of last 200 samples
        if (mouseSamplesRef.current.length > 200) {
          mouseSamplesRef.current.shift();
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Record a move timing
  const recordMoveTimestamp = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastMoveTimeRef.current;
    lastMoveTimeRef.current = now;
    moveTimingsRef.current.push(elapsed);
  }, []);

  // Compute Linearity Metric across sampled mouse trajectories
  const computeMouseLinearity = useCallback((): number => {
    const samples = mouseSamplesRef.current;
    if (samples.length < 15) return 0.15; // default normal human noise

    let totalR2 = 0;
    let windowCount = 0;

    // Check sliding windows of 10 points
    for (let i = 0; i <= samples.length - 10; i += 5) {
      const window = samples.slice(i, i + 10);
      const n = window.length;

      let sumX = 0,
        sumY = 0,
        sumXY = 0,
        sumX2 = 0,
        sumY2 = 0;

      for (const p of window) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
        sumY2 += p.y * p.y;
      }

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt(
        (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
      );

      if (denominator > 0.0001) {
        const r = Math.abs(numerator / denominator);
        totalR2 += r * r;
        windowCount++;
      }
    }

    if (windowCount === 0) return 0.2;
    // An average R^2 > 0.95 indicates artificial straight-line mouse vectors (e.g. scripted bot)
    return Number((totalR2 / windowCount).toFixed(3));
  }, []);

  const getTelemetrySnapshot = useCallback((): AntiCheatTelemetryData => {
    return {
      tabBlurCount,
      totalBlurTimeMs,
      clipboardPasteCount,
      mouseLinearityScore: computeMouseLinearity(),
      moveTimingsMs: [...moveTimingsRef.current],
    };
  }, [tabBlurCount, totalBlurTimeMs, clipboardPasteCount, computeMouseLinearity]);

  const resetTelemetry = useCallback(() => {
    setTabBlurCount(0);
    setTotalBlurTimeMs(0);
    setClipboardPasteCount(0);
    mouseSamplesRef.current = [];
    moveTimingsRef.current = [];
    lastMoveTimeRef.current = Date.now();
  }, []);

  return {
    recordMoveTimestamp,
    getTelemetrySnapshot,
    resetTelemetry,
    tabBlurCount,
    totalBlurTimeMs,
    clipboardPasteCount,
  };
}
