# Income Verification Analyst

A web application for verifying income eligibility against the Federal Poverty Level (FPL) guidelines. Uses AI-powered document analysis to extract income information from uploaded documents.

## Features

- **Password-Protected Access**: Session-based authentication with 24-hour token expiry
- **Document Upload**: Supports PDF, PNG, and JPG files (up to 3.5 MB total)
- **Dynamic Income Thresholds**: Displays the 200% FPL eligibility threshold based on household size
- **AI-Powered Analysis**: Uses Google Gemini to extract and verify income from documents
- **Eligibility Determination**: Compares extracted income against 200% FPL threshold
- **PDF Export**: Generate downloadable summary reports

## 2024 Federal Poverty Level Guidelines

The app uses the 2024 HHS Poverty Guidelines for the 48 contiguous states and D.C.:

| Household Size | 100% FPL | 200% FPL (Eligibility Threshold) |
|----------------|----------|----------------------------------|
| 1 | $15,060 | $30,120 |
| 2 | $20,440 | $40,880 |
| 3 | $25,820 | $51,640 |
| 4 | $31,200 | $62,400 |
| 5 | $36,580 | $73,160 |
| 6 | $41,960 | $83,920 |
| 7 | $47,340 | $94,680 |
| 8 | $52,720 | $105,440 |
| Each additional | +$5,380 | +$10,760 |

## Environment Variables

Create a `.env` file with the following:

```
GEMINI_API_KEY=your_gemini_api_key
INCOME_VERIFIER_PASSWORD=your_password
PORT=3000  # optional, defaults to 3000
```

## Local Development

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Run development server (frontend only)
npm run dev

# Run production server
node server.js
```

## Production Deployment

The app runs as a PM2 process:

```bash
# Build frontend
npm run build

# Compile TypeScript server
npx tsc server.ts --esModuleInterop --module ESNext --moduleResolution node --target ES2020 --skipLibCheck

# Start with PM2
pm2 start server.js --name income-verifier

# Save PM2 config
pm2 save
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth` | POST | No | Authenticate with password, returns session token |
| `/api/analyze` | POST | Yes | Analyze uploaded documents for income verification |

### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained from `/api/auth` and expire after 24 hours.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Backend**: Express 5, Node.js
- **AI**: Google Gemini 2.5 Pro
- **Styling**: Custom CSS design system (DM Serif Display + DM Sans fonts)
- **PDF Generation**: jsPDF

## Security

Security measures implemented (January 2026):

| Feature | Implementation |
|---------|----------------|
| **Required Auth** | `INCOME_VERIFIER_PASSWORD` env var must be set - server exits if missing |
| **Rate Limiting** | Auth endpoint limited to 5 attempts per 15 minutes per IP |
| **CORS Restriction** | Origins restricted via `CORS_ORIGIN` env var (defaults to production URL) |
| **Error Handling** | Auth errors don't reveal whether password is incorrect vs other errors |
| **Session Tokens** | 24-hour expiry, cleaned up hourly |

### Required Environment Variables

```env
INCOME_VERIFIER_PASSWORD=your-secure-password  # REQUIRED - no default
GEMINI_API_KEY=your-gemini-api-key
CORS_ORIGIN=https://income.wxworks.org  # Optional, defaults to this
```

### Troubleshooting Security Issues

- **"Server not starting"**: Check that `INCOME_VERIFIER_PASSWORD` is set in `.env`
- **"Too many attempts"**: Wait 15 minutes or restart server to clear rate limit state
- **"CORS errors"**: Ensure `CORS_ORIGIN` matches your frontend domain

## URL

Production: https://income.wxworks.org
