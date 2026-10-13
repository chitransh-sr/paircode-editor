# PairCode for Interviews

A lightweight, real-time collaborative code editor designed specifically for technical interviews. No setup required — just share a link and start coding.

## Features

- **Real-time collaboration** with Yjs CRDT-based sync
- **Monaco Editor** (same engine as VS Code)
- **15+ language support** including JavaScript, TypeScript, Python, Go, Rust, Java, C++, and more
- **Code execution** with sandboxed runtime
- **Presence awareness** showing cursor positions and selections of other users
- **Zero-install** — works entirely in the browser
- **Mobile-friendly** responsive design

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Setup

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd paircode-editor
npm install
```

### 2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using the editor. No database or API keys needed — rooms live in server memory and code runs locally.

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Editor | Monaco Editor v0.57 |
| Collaboration | Yjs (CRDT) |
| Real-time | Supabase Realtime |
| Database | Supabase (PostgreSQL) |
| Code Execution | Node.js child_process (sandboxed) |
| Styling | Tailwind CSS v4 |

### Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── rooms/              # Room management
│   │   ├── rooms/[id]/         # Room CRUD
│   │   ├── rooms/[id]/snapshots/
│   │   └── execute/            # Code execution endpoint
│   ├── room/[id]/page.tsx      # Room view
│   ├── page.tsx                # Landing page
│   └── layout.tsx              # Root layout
├── components/
│   ├── editor/                 # Monaco editor components
│   ├── room/                   # Room UI components
│   ├── output/                 # Console panel
│   └── ui/                     # Shared UI
├── hooks/                      # React hooks
├── lib/                        # Utilities and integrations
│   ├── supabase/              # Supabase client setup
│   ├── yjs/                   # Yjs CRDT + awareness
│   ├── presence/              # User presence/colors
│   └── execute/               # Language metadata
└── types/                     # TypeScript types
```

## Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | No | App URL for production |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/rooms` | Create a new room |
| GET | `/api/rooms/:id` | Get room by ID |
| PATCH | `/api/rooms/:id` | Update room settings |
| DELETE | `/api/rooms/:id` | Delete a room |
| POST | `/api/rooms/:id/snapshots` | Save a code snapshot |
| GET | `/api/rooms/:id/snapshots` | List snapshots |
| POST | `/api/execute` | Execute code |

## Supported Languages

JavaScript, TypeScript, Python, Go, Rust, Java, C++, C, Ruby, PHP

## License

MIT
