# AI-Powered Yoga Trainer Marketplace

Production-oriented full-stack app for matching students with yoga trainers, managing sessions, supporting real-time chat/video, and generating AI-assisted yoga insights.

## Overview

- Frontend: React + Vite
- Backend: Node.js + Express + Socket.io
- Database: Cloud Firestore
- AI: OpenRouter-compatible backend integration

The system supports two primary roles:

- Student
- Trainer

## Repository Layout

- `frontend/` - React client
- `backend/` - Express API, Firestore access, AI services, Socket.io
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes

## Features

- Authentication and role-based access control
- Student onboarding and profile management
- Trainer onboarding, profile, and availability management
- Trainer browsing and filtering
- Session booking and completion flow
- Real-time chat and call UI
- AI yoga plan generation
- AI trainer matching
- AI session summaries
- Weekly progress insights
- Firestore-backed reviews and session history

## Prerequisites

- Node.js 18+
- npm
- Firebase project with Firestore enabled
- OpenRouter API key for AI requests

## Installation

Install dependencies for each package:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

## Environment Variables

### Backend: `backend/.env`

```env
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173
BODY_LIMIT=1mb

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
FIRESTORE_DATABASE_ID=(optional)

AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=mistralai/mistral-7b-instruct
OPENROUTER_TIMEOUT_MS=30000
```

Notes:

- `OPENROUTER_API_KEY` must stay server-side.
- The backend also contains provider hooks for other AI backends, but OpenRouter is the primary documented path here.

### Frontend: `frontend/.env`

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Development

Run both apps together from the repo root:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:backend
npm run dev:frontend
```

## Build

Build the frontend:

```bash
npm run build
```

## Tests

Run backend tests:

```bash
npm test
```

## Backend Scripts

- `npm --prefix backend run dev`
- `npm --prefix backend run start`
- `npm --prefix backend run test`

## Frontend Scripts

- `npm --prefix frontend run dev`
- `npm --prefix frontend run build`
- `npm --prefix frontend run preview`

## API Surface

Main routes exposed under `/api`:

- `/api/health`
- `/api/auth`
- `/api/sessions`
- `/api/ai`
- `/api/trainers`
- `/api/availability/:trainerId`
- `/api/chats`
- `/api/student-profile`
- `/api/reviews`
- `/api/connections`

## Firestore Collections

Core data model includes:

- `users`
- `studentProfiles`
- `trainerProfiles`
- `sessions`
- `chats`
- `messages`
- `reviews`
- `aiReports`

Rules and indexes are managed at the repository root with `firestore.rules` and `firestore.indexes.json`.

## AI Workflows

The backend generates structured AI output for:

- Personalized yoga plans
- Trainer matching
- Session summaries
- Weekly progress reports
- Chat responses

AI responses are expected to be validated before persistence, and failed provider calls should return structured errors so the client can retry.

## Security Notes

- Keep service-account and AI keys server-side only.
- Firestore should be protected with role-aware security rules.
- AI endpoints are rate-limited in the backend.
- The app uses JWT-based auth checks in the API layer.

## License

MIT
