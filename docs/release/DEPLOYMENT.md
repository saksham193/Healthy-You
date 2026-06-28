# Deployment

## Backend Deployment

1. Set `HEALTHY_YOU_BACKEND_ENV` or provide environment variables directly in the host.
2. Provide real `JWT_SECRET` and `OPENAI_API_KEY` through the deployment secret store.
3. Use a persistent `DATABASE_URL`.
4. Restrict `CORS_ORIGIN` to the deployed mobile/web origin.
5. Run:

```bash
npm run backend:build
npm run backend:start
```

## Mobile Deployment

1. Set `EXPO_PUBLIC_ENVIRONMENT`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to the deployed backend HTTPS URL.
3. Run typecheck and export validation.
4. Run EAS Android preview.
5. Smoke test the APK on a physical device.
6. Promote to production build only after backend and OpenAI live validation pass.

## OpenAI

OpenAI must remain backend-only. The mobile app must never include an OpenAI secret. The backend `/status` endpoint reports whether OpenAI is configured.
