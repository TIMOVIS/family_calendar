<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# fam.ly - Family Calendar App

A family calendar application with AI-powered chat assistant, built with React, Vite, Supabase, and Google Gemini.

View your app in AI Studio: https://ai.studio/apps/drive/1sPvU7w0i-5JnlE1XnMjwJ26B2ztxMiH1

## Prerequisites

- Node.js 20 or higher
- A Supabase project (for database and authentication)
- A Google Gemini API key

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
# Get these from your Supabase project settings: https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini API Key
# Get this from Google AI Studio: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key
```

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file with your environment variables (see above)

3. Run the development server:
   ```bash
   npm run dev
   ```

   Or use Netlify CLI for local function testing:
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```

## Build for Production

```bash
npm run build
```

The build output will be in the `dist` directory.

## Deploy to Netlify

### Option 1: Deploy via Netlify UI

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to [Netlify](https://app.netlify.com) and click "New site from Git"

3. Connect your repository

4. Configure build settings (should auto-detect from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`

5. Add environment variables in Netlify dashboard:
   - Go to Site settings → Environment variables
   - Add the following:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `GEMINI_API_KEY`

6. Deploy!

### Option 2: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize and deploy:
   ```bash
   netlify init
   netlify deploy --prod
   ```

4. Set environment variables:
   ```bash
   netlify env:set VITE_SUPABASE_URL your_supabase_url
   netlify env:set VITE_SUPABASE_ANON_KEY your_anon_key
   netlify env:set GEMINI_API_KEY your_gemini_key
   ```

## Database Setup

The app requires Supabase tables for families, members, events, etc. Make sure your Supabase database is set up with the necessary schema. SQL migration files are included in the root directory:
- `add_event_completed_column.sql`
- `add_member_completed_days_table.sql`
- `add_member_points_column.sql`

Run these migrations in your Supabase SQL editor if needed.

## Supabase Configuration

### Password Reset Email Configuration

To enable password reset functionality, configure the redirect URL in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your site URL to the **Redirect URLs** list:
   - For local development: `http://localhost:3000`
   - For production: `https://your-domain.netlify.app` (or your custom domain)
4. The password reset emails will automatically redirect to your app with the reset token

The app will automatically detect the reset token from the email link and show the password reset page.

## Project Structure

```
fam.ly/
├── components/          # React components
├── lib/                 # Supabase client configuration
├── netlify/
│   └── functions/      # Netlify serverless functions
├── services/           # API services (Gemini, Supabase)
├── public/             # Static assets
└── dist/               # Build output (generated)
```
