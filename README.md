# Sagar & Dhrupti Wedding Website

A multilingual Gujarati wedding website and private administration dashboard.

## Stack
- Next.js App Router, React, TypeScript
- Supabase PostgreSQL, Auth, Storage and Row Level Security
- Vercel deployment target

## Project status
The Supabase project is provisioned in `ap-south-1`. The initial database migration is applied. Application implementation is in progress.

## Required environment variables
Copy `.env.example` to `.env.local` and fill in the Supabase project URL and anon key. Never commit service-role keys or OAuth secrets.

## Local development
```bash
npm install
npm run dev
```

See `docs/` for architecture, security and setup notes.
