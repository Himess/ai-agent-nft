"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ═══ Grain ══════════════════════════════════════════════════════════
// SVG fractal-noise overlay. Every section gets this as a thin
// atmospheric layer — turns flat black surfaces into something "filmic".

export function Grain({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        mixBlendMode: "overlay",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9  0 0 0 0 0.89  0 0 0 0 0.86  0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      }}
    />
  );
}

// ═══ Vignette ══════════════════════════════════════════════════════
// Radial darken of the edges. Keeps center bright, reinforces scroll
// tunnel feeling without turning into old-portfolio cringe.

export function Vignette({
  strength = 0.85,
}: {
  strength?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(10,10,10,${strength}) 100%)`,
      }}
    />
  );
}

// ═══ Marquee ═══════════════════════════════════════════════════════
// Horizontal scrolling band of ritual phrases. Items repeat seamlessly
// because we duplicate the content and translate -50%.

export function Marquee({
  items,
  reverse = false,
  durationSeconds = 60,
}: {
  items: string[];
  reverse?: boolean;
  durationSeconds?: number;
}) {
  const row = items.join("   ·   ") + "   ·   ";
  const content = row.repeat(3);
  return (
    <div
      className="relative overflow-hidden border-t border-b"
      style={{
        borderColor: "rgba(140,122,79,.18)",
        background: "rgba(10,10,10,.7)",
        padding: "22px 0",
      }}
    >
      <div
        data-surv-marquee
        style={{
          display: "flex",
          whiteSpace: "nowrap",
          width: "max-content",
          animation: `surv-marquee ${durationSeconds}s linear infinite ${reverse ? "reverse" : ""}`,
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 28,
          color: "rgba(232,228,220,.65)",
          letterSpacing: "0.02em",
        }}
      >
        <span>{content}</span>
        <span>{content}</span>
      </div>
    </div>
  );
}

// ═══ ScrollReveal ══════════════════════════════════════════════════
// Wrap anything to have it fade+rise into view the first time it
// enters the viewport. Respects prefers-reduced-motion via CSS.

export function ScrollReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      el.classList.add("is-revealed");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add("is-revealed"), delay);
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`surv-reveal ${className}`.trim()}>
      {children}
    </div>
  );
}

// ═══ HeroVideo ═════════════════════════════════════════════════════
// Autoplay muted loop video with WebM + MP4 sources and JPG poster
// fallback. Honors prefers-reduced-motion and data-saver / slow-network
// hints — on 2G/3G or Save-Data, we do not download the video at all,
// just render the poster. Keeps mobile bandwidth usage predictable on
// launch day without hurting the desktop experience.

type HeroConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

function shouldSkipVideo(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  const conn = (navigator as unknown as { connection?: HeroConnection }).connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType)) {
    return true;
  }
  return false;
}

export function HeroVideo({
  srcMp4,
  srcWebm,
  poster,
  className = "",
}: {
  srcMp4: string;
  srcWebm?: string;
  poster: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (shouldSkipVideo()) return;
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const v = ref.current;
    if (!v) return;
    // Some browsers need an explicit play() after muted autoplay no-ops.
    const kick = () => v.play().catch(() => {});
    v.addEventListener("loadeddata", kick, { once: true });
    return () => v.removeEventListener("loadeddata", kick);
  }, [active]);

  if (!active) {
    return (
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className={className}
        draggable={false}
      />
    );
  }

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-hidden="true"
    >
      {srcWebm ? <source src={srcWebm} type="video/webm" /> : null}
      <source src={srcMp4} type="video/mp4" />
    </video>
  );
}
