<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1HNxboNeTVeLfBPzXlz5Io7K-N6u56UX_

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

1. Push your code to GitHub (already done!)
2. Import your repository in Vercel: https://vercel.com/new
3. Configure the environment variable:
   - Add `GEMINI_API_KEY` with your Gemini API key value
4. Deploy!

Vercel will automatically:
- Detect the Vite build configuration
- Set up the serverless function at `/api/analyze`
- Build and deploy your application
