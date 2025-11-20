# WebRankingReports

A modern SaaS dashboard for tracking website rankings, built with Nuxt 3, Tailwind CSS, and Supabase.

## Tech Stack

- **Nuxt 3** - Vue.js framework
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Authentication and database
- **Netlify** - Deployment platform

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (get one at [supabase.com](https://supabase.com))

## Installation

1. Clone the repository and navigate to the project directory:
```bash
cd webrankreports2
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your Supabase credentials to `.env`:
```
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
webrankreports2/
├── assets/
│   └── css/
│       └── main.css          # Tailwind base styles
├── layouts/
│   └── default.vue           # Main layout with navigation
├── middleware/
│   └── auth.ts               # Route protection middleware
├── pages/
│   ├── auth/
│   │   ├── login.vue         # Login page
│   │   └── register.vue      # Registration page
│   ├── dashboard.vue         # Main dashboard
│   └── sites/
│       ├── index.vue         # Sites list
│       └── [id]/
│           └── dashboard.vue # Individual site dashboard
├── plugins/
│   └── supabase.client.ts    # Supabase client plugin
├── nuxt.config.ts            # Nuxt configuration
├── tailwind.config.js        # Tailwind configuration
└── netlify.toml              # Netlify deployment config
```

## Deployment to Netlify

### Netlify Publish Directory

**Publish Directory:** `.output/public`

### Steps

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. In Netlify:
   - Go to "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Configure build settings:
     - **Build command:** `npm run build`
     - **Publish directory:** `.output/public`
   - Add environment variables:
     - `SUPABASE_URL` - Your Supabase project URL
     - `SUPABASE_ANON_KEY` - Your Supabase anonymous key

3. Deploy!

The `netlify.toml` file is already configured with the correct build settings and redirects.

## Pages & Routes

- `/auth/login` - User login (public)
- `/auth/register` - User registration (public)
- `/dashboard` - Main dashboard (protected)
- `/sites` - Sites list (protected)
- `/sites/[id]/dashboard` - Individual site dashboard (protected)

## Authentication

The app uses Supabase for authentication. Protected routes (dashboard and sites) require users to be logged in. Unauthenticated users are automatically redirected to the login page.

## License

MIT

