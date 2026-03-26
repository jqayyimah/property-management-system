# Property Management System

FastAPI + MySQL + SQLAlchemy backend with a React + TypeScript frontend.

## Deploy Readiness

This repo is now prepared for hosting with:

- backend dependency file: [requirements.txt](/Users/qayyimah/projects/requirements.txt)
- backend container: [Dockerfile](/Users/qayyimah/projects/Dockerfile)
- backend env example: [.env.example](/Users/qayyimah/projects/.env.example)
- frontend env example: [frontend/.env.example](/Users/qayyimah/projects/frontend/.env.example)

## Backend Hosting

The backend serves with:

```bash
uvicorn app.api:app --host 0.0.0.0 --port 8000
```

Or with Docker:

```bash
docker build -t property-manager-api .
docker run --env-file .env -p 8000:8000 property-manager-api
```

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `FRONTEND_BASE_URL`

Recommended environment variables:

- SMTP settings for email verification and password reset
- Termii settings for SMS and WhatsApp reminders
- Flutterwave keys for billing

## Frontend Hosting

The frontend builds as a static Vite app:

```bash
cd frontend
npm install
npm run build
```

Set:

```bash
VITE_API_URL=https://your-backend-domain.example
```

The generated static files are in `frontend/dist`.

## Suggested Deployment Order

1. Provision a managed MySQL database.
2. Deploy the backend and set backend environment variables.
3. Deploy the frontend with `VITE_API_URL` pointing to the backend.
4. Update backend `FRONTEND_BASE_URL` to the real frontend URL.
5. Test:
   - signup/login
   - email verification
   - admin approval
   - property/apartment/tenant/rent flows
   - reminder scheduling
   - billing checkout
