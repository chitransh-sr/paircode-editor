'use client';

import { useState, useRef, useEffect } from "react";
import { Copy, Check, Share2 } from "lucide-react";

interface ShareLinkProps {
  roomId: string;
  onCopy?: () => void;
}

export function ShareLink({ roomId, onCopy }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve origin on the client only (SSR-safe)
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const roomUrl = origin ? `${origin}/room/${roomId}` : `/room/${roomId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select and copy
      if (inputRef.current) {
        inputRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 border border-border">
      <Share2 className="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={roomUrl}
        readOnly
        className="bg-transparent border-none outline-none text-sm text-foreground w-64 truncate"
        onFocus={(e) => e.target.select()}
      />
      <button
        onClick={copyToClipboard}
        className="p-1 hover:bg-muted/80 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title="Copy link"
      >
        {copied ? (
          <Check className="w-4 h-4 text-accent" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
