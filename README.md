<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1sPvU7w0i-5JnlE1XnMjwJ26B2ztxMiH1

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

Note: For local development, you may need to set up a local Netlify dev environment or use a proxy to test the Netlify function.

## Deploy to Netlify

1. Connect your repository to Netlify
2. Set the `GEMINI_API_KEY` environment variable in Netlify:
   - Go to Site settings → Environment variables
   - Add: `GEMINI_API_KEY` with your Gemini API key value
3. Deploy - Netlify will automatically build and deploy using the `netlify.toml` configuration

**Important:** The API key is stored securely in Netlify environment variables and is only accessible in the serverless function at `/.netlify/functions/generate`. The key is never exposed to the client-side code.
