'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CodeXml,
  GraduationCap,
  Plus,
  Users,
  Zap,
} from "lucide-react";
import type { Room } from "@/types/room";
import { RoomDashboard } from "@/components/room/room-dashboard";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleCreateRoom = (room: Room) => {
    router.push(`/room/${room.id}`);
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  const scrollToDashboard = () => {
    document.getElementById("dashboard")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="relative min-h-svh bg-background overflow-x-clip">
      {/* Ambient premium background: dotted grid + breathing accent glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[880px] h-[540px] rounded-full bg-accent/10 blur-[130px] float-slow" />
        <div className="absolute -bottom-52 -right-24 w-[560px] h-[430px] rounded-full bg-accent/5 blur-[110px]" />
      </div>

      {/* Sticky glass top bar */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
              <CodeXml className="w-4 h-4 text-accent" />
            </span>
            <span className="text-lg font-bold tracking-tight text-gradient truncate">
              PairCode
            </span>
          </span>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a
              href="#features"
              className="hidden sm:inline-flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
            >
              Features
            </a>
            <button
              onClick={scrollToDashboard}
              className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground px-3.5 sm:px-4 py-2 rounded-lg text-sm font-medium glow-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Room
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-4 pt-16 sm:pt-24 pb-14 sm:pb-20 text-center">
        <div className="max-w-3xl mx-auto">
          <span
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass text-xs sm:text-sm text-muted-foreground rise-in ${mounted ? "" : "opacity-0"}`}
          >
            <span className="relative flex w-2 h-2 shrink-0">
              <span className="absolute inline-flex w-full h-full rounded-full bg-accent opacity-60 breathe" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-accent" />
            </span>
            Live collaborative interviews — zero setup
          </span>

          <h1
            className={`mt-6 text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.06] text-balance rise-in rise-in-1 ${mounted ? "" : "opacity-0"}`}
          >
            Run technical
            <br className="hidden sm:block" /> interviews, <span className="text-gradient">without friction</span>
          </h1>

          <p
            className={`mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed rise-in rise-in-2 ${mounted ? "" : "opacity-0"}`}
          >
            A crisp, real-time collaborative code editor built for interviews.
            Create a room, share one link — your candidate is coding in seconds,
            on any device.
          </p>

          <div
            className={`mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 rise-in rise-in-3 ${mounted ? "" : "opacity-0"}`}
          >
            <button
              onClick={scrollToDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-xl text-sm sm:text-base font-medium glow-accent hover:bg-accent/90 hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              Start an interview
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={scrollToDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 glass text-foreground px-6 py-3 rounded-xl text-sm sm:text-base font-medium hover:bg-muted/70 hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-accent" />
              Join with a link
            </button>
          </div>

          <dl
            className={`mt-10 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-xs sm:text-sm text-muted-foreground rise-in rise-in-4 ${mounted ? "" : "opacity-0"}`}
          >
            <span className="font-mono font-medium text-foreground">15+</span>
            <span>languages</span>
            <span aria-hidden className="text-border">•</span>
            <span className="font-mono font-medium text-foreground">&lt;100ms</span>
            <span>sync</span>
            <span aria-hidden className="text-border">•</span>
            <span className="font-mono font-medium text-foreground">0</span>
            <span>installs needed</span>
          </dl>
        </div>
      </section>

      {/* Role selection / create / join (existing dashboard, anchored) */}
      <section id="dashboard" className="relative scroll-mt-20 px-4 pb-4">
        <RoomDashboard onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
      </section>

      {/* Features */}
      <section id="features" className="relative scroll-mt-20 px-4 pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Everything an interview needs
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Purpose-built for the hour that decides your hire.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
            {[
              {
                icon: Zap,
                title: "Instant setup",
                copy: "Create a room in one click. No accounts, no downloads — a link is the whole invite.",
              },
              {
                icon: Users,
                title: "Real-time sync",
                copy: "CRDT-based collaboration under 100ms, with live cursors and presence for every participant.",
              },
              {
                icon: Briefcase,
                title: "Code execution",
                copy: "Run code in 15+ languages with sandboxed execution and instant output, right in the room.",
              },
            ].map(({ icon: Icon, title, copy }) => (
              <div
                key={title}
                className="group glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-premium-xl focus-within:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-xl bg-accent/12 border border-accent/20 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-4 pb-10">
        <div className="max-w-4xl mx-auto pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CodeXml className="w-3.5 h-3.5 text-accent" />
            <span className="font-semibold text-foreground/80">PairCode</span>
            <span aria-hidden>— build together, decide faster</span>
          </span>
          <span className="inline-flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> Real-time
            </span>
            <span className="inline-flex items-center gap-1">
              <Zap className="w-3 h-3" /> Zero setup
            </span>
            <span>© 2026</span>
          </span>
        </div>
      </footer>
    </main>
  );
}
