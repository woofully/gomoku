# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fully functional Gomoku (five-in-a-row) game built with Next.js 15, React 19, TypeScript, and Tailwind CSS v4. Players can authenticate via Google or WeChat using NextAuth, play solo games, or join multiplayer rooms to compete with other players.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

- **Framework**: Next.js 15 with App Router and Turbopack
- **Styling**: Tailwind CSS v4 with CSS custom properties
- **Authentication**: NextAuth v4 configured
- **Fonts**: Geist Sans and Geist Mono via next/font/google
- **TypeScript**: Strict mode enabled with path mapping (`@/*` -> `./src/*`)

### Project Structure

```
src/
  app/                        # App Router pages and layouts
    layout.tsx                # Root layout with SessionProvider
    page.tsx                  # Main game page (solo play)
    auth/signin/page.tsx      # Authentication page
    lobby/page.tsx            # Multiplayer lobby
    game/[roomId]/page.tsx    # Multiplayer game room
    api/auth/[...nextauth]/   # NextAuth API routes
    globals.css               # Global Tailwind styles
  components/
    providers.tsx             # NextAuth SessionProvider wrapper
    game/board.tsx           # Gomoku game board component
  lib/
    game-logic.ts            # Core game logic and win detection
  types/
    game.ts                  # TypeScript game type definitions
```

## Game Features

- **Authentication**: Google and WeChat login via NextAuth
- **Solo Play**: Single-player mode with local game state
- **Multiplayer**: Room-based multiplayer with turn management
- **Game Logic**: Complete Gomoku rules with win detection
- **Responsive UI**: Clean, game-focused interface with Tailwind CSS
- **15x15 Board**: Traditional Gomoku board with star points
- **Turn Indicators**: Clear visual feedback for current player
- **Game History**: Move tracking and game state management

## Environment Setup

Create `.env.local` with:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
```

## Real-Time Features

- **Socket.io Integration**: Real-time multiplayer communication
- **Database Persistence**: PostgreSQL (Neon) with Prisma ORM for game state
- **Live Updates**: Instant move synchronization between players
- **Room Management**: Dynamic room creation, joining, and status updates
- **Spectator Mode**: Real-time game watching for non-players

## Database Schema

- **Users**: Store player profiles from OAuth providers
- **GameRooms**: Persistent game state with board, moves, and player assignments
- **Real-time Sync**: Socket.io events for instant updates across clients
- **Cloud Database**: Hosted on Neon PostgreSQL for production-ready persistence

## Development Commands

- `npm run dev` - Start development server with Socket.io
- `npm run db:push` - Apply database schema changes
- `npm run db:generate` - Generate Prisma client

## Game Implementation Notes

- Real-time multiplayer with Socket.io server
- Persistent game state in PostgreSQL (Neon) database
- Win detection checks all 4 directions (horizontal, vertical, diagonal)
- Black always moves first following Gomoku conventions
- Automatic reconnection and error handling
- Production-ready cloud database hosting