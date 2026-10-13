'use client';

import { useRouter } from "next/navigation";
import { Plus, Users, CodeXml } from "lucide-react";
import type { Room } from "@/types/room";
import { HeroLines } from "@/components/hero/hero-lines";
import { RoomDashboard } from "@/components/room/room-dashboard";

export default function HomePage() {
  const router = useRouter();

  const handleCreateRoom = (room: Room) => {
    router.push(`/room/${room.id}`);
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  return (
    <main className="relative min-h-screen bg-background overflow-hidden">
      {/* Animated hero lines (isometric grid + flowing S-curves) */}
      <HeroLines />
      {/* Subtle OLED glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/15 rounded-full blur-[80px]" />
      </div>

      <div className="relative container mx-auto py-16 px-4">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            PairCode
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            A lightweight, real-time collaborative code editor designed specifically for technical interviews.
            No setup required — just share a link and start coding.
          </p>
        </div>

        {/* Dashboard (role selection, create/join, recent rooms) */}
        <RoomDashboard onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />

        {/* Features grid */}
        <div className="max-w-4xl mx-auto mt-20">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="group bg-card rounded-xl p-6 border border-border hover:shadow-xl transition-all duration-300 hover:border-accent">
              <div className="w-10 h-10 bg-accent/15 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Instant Setup</h3>
              <p className="text-sm text-muted-foreground">Create a room in one click. No accounts, no downloads.</p>
            </div>

            <div className="group bg-card rounded-xl p-6 border border-border hover:shadow-xl transition-all duration-300 hover:border-accent">
              <div className="w-10 h-10 bg-accent/15 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Real-time Sync</h3>
              <p className="text-sm text-muted-foreground">CRDT-based sync with &lt;100ms latency. Never lose your work.</p>
            </div>

            <div className="group bg-card rounded-xl p-6 border border-border hover:shadow-xl transition-all duration-300 hover:border-accent">
              <div className="w-10 h-10 bg-accent/15 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <CodeXml className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Code Execution</h3>
              <p className="text-sm text-muted-foreground">Run code in 15+ languages with sandboxed execution.</p>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-8 pb-4 border-t border-border">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
              Live collaboration
            </span>
            <span className="mx-2">•</span>
            <span>15+ languages</span>
            <span className="mx-2">•</span>
            <span>Real-time sync</span>
          </div>
        </div>
      </div>
    </main>
  );
}
