# Environment Setup

Healthy You uses separate environment files for mobile and backend release targets.

## Mobile

Files:

- `.env.example`
- `.env.development`
- `.env.staging`
- `.env.production`
- `.env.development.local` for machine-specific physical-device URLs

Required variables:

```bash
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_API_BASE_URL=auto
```

Development uses `auto` so the app resolves:

- Web and iOS simulator: `http://localhost:4000`
- Android emulator: `http://10.0.2.2:4000`

For Expo Go on a physical Android device, create `.env.development.local`:

```bash
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:4000
```

Staging and production must use reachable HTTPS API URLs.

## Backend

Files:

- `backend/.env.example`
- `backend/.env.development`
- `backend/.env.staging`
- `backend/.env.production`
- `backend/.env.production.local` for real secrets

Required variables:

```bash
ENVIRONMENT=production
PORT=4000
JWT_SECRET=replace-with-secure-secret-min-32-chars
OPENAI_API_KEY=replace-with-openai-key-in-deployment-secret-store
DATABASE_URL=file:backend/data/healthy-you-production.sqlite
CORS_ORIGIN=https://healthy-you.example.com
OPENAI_MODEL=gpt-4.1-mini
```

Do not commit real `JWT_SECRET` or `OPENAI_API_KEY` values.

## Startup Validation

Production backend startup fails if:

- JWT secrets are missing.
- OpenAI key is missing.
- CORS origin is unrestricted.
- Placeholder secrets are still present.
