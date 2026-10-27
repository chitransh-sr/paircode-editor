'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Link2,
  Plus,
  Zap,
  Users,
  Briefcase,
} from "lucide-react";
import type { Room } from "@/types/room";
import { RoomDashboard } from "@/components/room/room-dashboard";
import { Reveal, useScrolled } from "@/components/reveal";
import {
  Corners,
  GithubMark,
  IsoGrid,
  PairMark,
  FillLink,
  FlowLines,
} from "@/components/landing-chrome";
import { ModeToggle } from "@/components/editor/mode-toggle";
import { LANGUAGES } from "@/lib/execute/languages";

const REPO_URL = "https://github.com/chitransh-sr/paircode-editor";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant setup",
    body: "Create a room in one click. No accounts, no downloads — a link is the whole invite.",
  },
  {
    icon: Users,
    title: "Real-time sync",
    body: "Yjs CRDT-based collaboration under 100ms, with live cursors and presence for every participant.",
  },
  {
    icon: Briefcase,
    title: "Code execution",
    body: "Run code in 15+ languages with sandboxed execution and instant output, right in the room.",
  },
];

/** Spec bar under the hero — product facts, not marketing copy. */
const SPECS = ["yjs sync", "monaco editor", "sandboxed exec", "15+ languages", "<100ms"];

const NAV_LINKS: Array<[string, string]> = [
  ["Rooms", "#dashboard"],
  ["Features", "#features"],
  ["Languages", "#languages"],
];

export default function HomePage() {
  const router = useRouter();
  const scrolled = useScrolled(24);

  const handleCreateRoom = (room: Room) => {
    router.push(`/room/${room.id}`);
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  // Cursor-follow hero glow (landing hero choreography).
  const heroRef = useRef<HTMLElement>(null);
  const glowRaf = useRef(0);
  const [glowOn, setGlowOn] = useState(false);

  const onHeroMouseMove = (e: React.MouseEvent) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = heroRef.current;
    if (!el) return;
    cancelAnimationFrame(glowRaf.current);
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowRaf.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      setGlowOn(true);
    });
  };

  useEffect(() => () => cancelAnimationFrame(glowRaf.current), []);

  const marqueeLanguages = LANGUAGES.filter((lang) => !lang.hidden).map(
    (lang) => lang.label
  );

  return (
    <div className="w-full max-w-[1536px] mx-auto relative min-h-dvh flex flex-col overflow-x-clip bg-background text-foreground selection:bg-accent/20 selection:text-foreground">
      {/* Radial vignette (landing backdrop) */}
      <div className="pointer-events-none fixed inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(6,6,8,0.5)_65%,#060608_100%)] z-0" />

      {/* ── Sticky pill nav ─── */}
      <header className="sticky top-0 z-50 w-full px-4 pt-3">
        <nav
          data-scrolled={scrolled}
          className="nav-pill w-full mx-auto flex flex-col items-center justify-center px-3 sm:px-6 transition-shadow duration-300"
          style={{ maxWidth: 920, paddingTop: 9, paddingBottom: 9 }}
        >
          <div className="relative w-full flex items-center justify-between" style={{ maxWidth: 900 }}>
            <a href="#top" className="flex items-center gap-2 cursor-pointer group shrink-0">
              <div className="relative w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-foreground/[0.03] border border-foreground/10 shadow-[0_0_12px_rgba(34,197,94,0.25)] group-hover:scale-105 transition-transform duration-300">
                <PairMark className="w-4 h-4" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-foreground group-hover:text-foreground/80 transition-colors duration-300">PairCode</span>
            </a>
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(([label, href]) => (
                <a key={href} href={href} className="nav-link px-3 py-1.5 text-[13px] rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]">
                  {label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ModeToggle />
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="group relative flex items-center gap-1.5 px-3 py-2 h-9 bg-foreground/[0.05] border border-foreground/20 hover:border-foreground/40 text-sm font-medium text-foreground transition-all cursor-pointer shrink-0"
              >
                <Corners />
                <GithubMark className="w-4 h-4" />
                <span className="hidden min-[400px]:inline">Star</span>
              </a>
              <a
                href="#dashboard"
                className="group relative hidden sm:flex items-center gap-1.5 px-3.5 py-2 h-9 bg-foreground hover:bg-foreground/90 text-background text-sm font-semibold transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Corners />
                <Plus className="w-4 h-4 shrink-0" />
                <span>New Room</span>
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* ── Product hero: compact, leads straight into the workspace ───── */}
      <section
        id="top"
        ref={heroRef}
        onMouseMove={onHeroMouseMove}
        className="relative flex flex-col items-center justify-center text-center w-full pt-12 sm:pt-16 pb-4 sm:pb-6 overflow-visible"
      >
        <div className="pointer-events-none absolute inset-0 z-0 overflow-visible select-none">
          <IsoGrid />
          <FlowLines />
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-500"
            style={{
              opacity: glowOn ? 1 : 0,
              background: "radial-gradient(480px circle at var(--mx, 50%) var(--my, 30%), rgba(34,197,94,0.09), transparent 65%)",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4">
          <span
            className="hero-anim inline-flex items-center gap-2 px-3 py-1.5 border border-foreground/10 bg-foreground/[0.03] text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors mb-5"
            style={{ ["--hd" as string]: "0ms" }}
          >
            <span className="relative w-1.5 h-1.5 rounded-full bg-accent ping-ring" />
            Live collaborative interviews — zero setup
          </span>
          <h1 className="relative z-10 w-full text-center text-4xl sm:text-5xl lg:text-[52px] font-medium tracking-[-0.03em] text-foreground leading-[1.08] mb-4 mx-auto text-balance">
            <span className="hero-anim block" style={{ ["--hd" as string]: "90ms" }}>Run technical interviews,</span>
            <span
              className="hero-anim text-muted-foreground font-normal block mt-2 text-lg sm:text-2xl lg:text-[30px] tracking-[-0.02em]"
              style={{ ["--hd" as string]: "200ms" }}
            >
              without friction
            </span>
          </h1>
          <p
            className="hero-anim relative z-10 max-w-[640px] mx-auto text-sm sm:text-base text-muted-foreground/90 leading-relaxed font-normal mb-6"
            style={{ ["--hd" as string]: "310ms" }}
          >
            Create a room, share one link — your candidate is coding in seconds, on any device.
          </p>

          <div
            className="hero-anim relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto"
            style={{ ["--hd" as string]: "420ms" }}
          >
            <FillLink href="#dashboard" label="Create a room" variant="accent" className="sm:w-auto" icon={<Play className="w-[18px] h-[18px] fill-current" />} />
            <FillLink href="#dashboard" label="Join with a link" variant="white" icon={<Link2 className="w-5 h-5" />} />
          </div>

          {/* Product spec bar */}
          <div
            className="hero-anim relative z-10 flex flex-wrap items-center justify-center gap-2 mt-6"
            style={{ ["--hd" as string]: "520ms" }}
          >
            {SPECS.map((s) => (
              <span key={s} className="font-mono text-[11px] text-muted-foreground border border-foreground/[0.08] bg-foreground/[0.03] px-2.5 py-1 hover:border-foreground/25 hover:text-foreground transition-colors cursor-default">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workspace panel: pick a seat, create / join, recent rooms ─── */}
      {/* z-20 keeps the cards ABOVE the hero's flowing line decor in both
          themes — the lines read as running behind the workspace. */}
      <section id="dashboard" className="relative z-20 scroll-mt-24 px-4 pt-2 pb-6">
        <Reveal className="max-w-4xl mx-auto">
          <RoomDashboard onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
        </Reveal>
      </section>

      {/* ── Landing-style plus divider ────── */}
      <div className="relative w-full flex items-center justify-center pointer-events-none z-10 my-4">
        <div className="w-full border-t border-foreground/[0.08]" />
        <div className="absolute text-foreground/30 font-mono text-xs select-none bg-background px-3">+</div>
      </div>

      {/* ── What's inside the room ───────────── */}
      <section id="features" className="relative w-full scroll-mt-20 px-4 sm:px-6 lg:px-8 py-10 sm:py-14 z-10">
        <Reveal className="relative z-10 w-full max-w-4xl mx-auto text-center mb-8">
          <p className="font-mono text-[11px] tracking-[0.2em] text-accent mb-3">{`// INSIDE THE ROOM`}</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-[-0.02em] text-foreground leading-tight mb-2">What you get in every room</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">Everything a live coding session needs — nothing it doesn&apos;t.</p>
        </Reveal>
        <div className="w-full max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <div className="group card-lift relative border bg-card p-5 sm:p-6 transition-all duration-300 border-border hover:border-accent/40 h-full">
                <Corners />
                <div className="w-9 h-9 bg-accent/15 border border-accent/20 flex items-center justify-center mb-3.5 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
                  <f.icon className="w-4 h-4 text-accent" />
                </div>
                <h3 className="text-base font-medium text-foreground tracking-tight mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Languages marquee ────────────────── */}
      <section id="languages" className="relative w-full border-t border-foreground/[0.08] bg-foreground/[0.03] py-10 sm:py-14 overflow-hidden z-10 scroll-mt-20">
        <Reveal className="text-center mb-8 px-4">
          <p className="font-mono text-[11px] tracking-[0.2em] text-accent mb-3">{`// RUNS IN`}</p>
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground mb-2">Pick the language per room</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">Frontend to systems — executed in a sandbox, output streamed live.</p>
        </Reveal>
        <div
          className="relative overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          }}
        >
          <div className="flex w-max animate-paircode-marquee gap-3 pr-3">
            {[...marqueeLanguages, ...marqueeLanguages].map((lang, i) => (
              <span key={`${lang}-${i}`} className="px-4 py-2 text-sm whitespace-nowrap bg-card border border-border text-foreground/90 hover:bg-foreground hover:text-background hover:border-foreground transition-colors cursor-default">
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <footer className="relative z-10 text-center text-xs text-muted-foreground pt-8 pb-10 border-t border-foreground/[0.08] px-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <PairMark className="w-4 h-4" />
          <span className="font-semibold text-foreground">PairCode</span>
        </div>
        <div className="flex items-center justify-center gap-4 mb-4">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <GithubMark className="w-3.5 h-3.5" /> Repository
          </a>
          <span>•</span>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Issues</a>
          <span>•</span>
          <span>MIT License</span>
        </div>
        <p>Live collaboration · 15+ languages · Real-time sync</p>
      </footer>
    </div>
  );
}
