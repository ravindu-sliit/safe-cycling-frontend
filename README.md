# safe-cycling-frontend

Frontend web application for Safe Cycling. This React SPA provides login/session handling, hazard visualization, cycling route planning, reviews, and profile management for users and admins.

## 1. Local Setup Guide (Step by Step)

### 1.1 Prerequisites

- Node.js 18+ (recommended LTS)
- npm 9+
- Running backend API (local or cloud)

### 1.2 Clone and Install

1. Open a terminal in your working folder.
2. Clone and enter the frontend project:

```bash
git clone https://github.com/ravindu-sliit/safe-cycling-frontend.git
cd safe-cycling-frontend
```

3. Install dependencies:

```bash
npm install
```

### 1.3 Configure Environment Variables

1. Create a `.env` file in the project root.
2. Copy the keys from the next section exactly as written (without values).
3. Fill in values for your local/dev environment.

### 1.4 Run the Frontend Locally

Use development mode:

```bash
npm run dev
```

Create a production build locally:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### 1.5 Verify Startup

- Local app URL (default): http://localhost:5173
- Login page should load first when no active session exists.

## 2. Environment Variables

The following keys define frontend API routing, media integration, and third-party route planning behavior.

### 2.1 Frontend `.env` keys

```env
VITE_API_BASE_URL=
VITE_API_URL=
VITE_IMAGEKIT_URL_ENDPOINT=
VITE_IMAGEKIT_PUBLIC_KEY=
VITE_OPENROUTESERVICE_API_KEY=
```

### 2.2 System/Deployment keys used with this frontend

Frontend consumes API endpoints that are powered by backend secrets. Document these in the backend repository:

```env
MONGODB_URI=
JWT_SECRET=
```

## 3. Frontend Route Documentation

The app uses React Router with protected route guards and role checks.

| Path | Access | Purpose |
| --- | --- | --- |
| `/login` | Public | Sign in |
| `/register` | Public | User registration |
| `/verify-email/:token` | Public | Email verification callback |
| `/forgot-password` | Public | Password reset request |
| `/reset-password/:token` | Public | Password reset form |
| `/dashboard` | Authenticated user/admin | Main map dashboard |
| `/hazards` | Authenticated user/admin | Hazard list and actions |
| `/reviews` | Authenticated user/admin | Reviews and feedback |
| `/profile` | Authenticated user | User profile |
| `/admin/dashboard` | Authenticated admin | Admin summary dashboard |
| `/admin/map` | Authenticated admin | Admin map tools |
| `/admin/profile` | Authenticated admin | Admin profile |

## 4. Functional Components and Requirements

At least four core business components implemented in this frontend:

1. Authentication and Session UX
	- Login and account flows are exposed through dedicated pages.
	- Auth session is persisted with token and user data in localStorage.
	- Expired sessions are cleared automatically on 401 responses.

2. Route Planning and Map Interaction
	- Interactive map rendering via Leaflet/react-leaflet.
	- Cycling route planning integrates OpenRouteService from the client.
	- Route overlays, bounds, and route details are visualized in map mode.

3. Hazard Visualization and Reporting Flow
	- Hazard markers are rendered from API data.
	- Hazard severity and status are shown with visual badges and marker styles.
	- User-driven interactions support near-me filtering and hazard popups.

4. Review and Feedback Interface
	- Reviews pages display route-level feedback.
	- Authenticated users can submit and manage review interactions.

5. User/Admin Experience Split
	- Role-aware navigation and dashboards.
	- Admin-only views are protected and redirected for non-admin users.

## 5. State Management, Architecture, and Session Handling

### 5.1 State Management Approach

- Local UI state is managed with React hooks such as useState, useEffect, useMemo, and useEffectEvent.
- Global authentication/session state is managed with Context API (AuthContext).
- API communication is centralized in an Axios instance with request/response interceptors.

### 5.2 Architecture Justification

This project uses functional components and hooks instead of class components or Redux-heavy architecture because:

- Most state is feature-local (form, map, filter, panel state), making hooks a lightweight fit.
- Auth state is global but compact, so Context API is sufficient and keeps complexity low.
- Functional composition keeps route guards, map logic, and page concerns modular.

### 5.3 Session Management and Protected Routes

- Session data (token and user) is stored in localStorage.
- ProtectedRoute enforces authentication and role-based authorization.
- Unauthorized users are redirected to login; role mismatches are redirected to dashboard.
- Axios handles 401 globally by clearing session and redirecting to login.

## 6. UI/UX Framework and Responsiveness

- Tailwind CSS is used as the styling framework.
- The interface is responsive across mobile and desktop layouts.
- Components include role-aware navigation, map overlays, and adaptive panels for map workflows.

## 7. Third-Party Integrations

### OpenRouteService

OpenRouteService is used from the frontend map planner to:

- generate cycling paths,
- return route geometry for map display,
- support route summary metrics shown in planning UX.

### Additional services

- Backend API (Express on Vercel): all app data operations (auth, routes, hazards, reviews, users)
- OpenStreetMap/Nominatim: geocoding and reverse geocoding for map input flows
- ImageKit: hosted media URLs for uploaded images

## 8. Testing Instruction Report

### 8.1 Static Quality Checks

Run linter:

```bash
npm run lint
```

### 8.2 Build Verification

Run production build:

```bash
npm run build
```

Run local production preview:

```bash
npm run preview
```

### 8.3 Manual Smoke Test Checklist

- Verify login and logout behavior.
- Verify protected routes redirect correctly when unauthenticated.
- Verify map page loads and hazard markers render.
- Verify dashboard route refresh works (SPA rewrite behavior).

## 9. Deployment Section (Evidence)

### 9.1 Architecture Overview

- Frontend: React (Vite) on Vercel static hosting
- Backend: Node.js/Express on Vercel serverless runtime
- Database: MongoDB Atlas
- Media storage: ImageKit

### 9.2 Deployment Configuration Evidence

- SPA routing config: `vercel.json` rewrite to `index.html`
- Production build command: `npm run build`

### 9.3 Successful Deployment Evidence (Links)

- Frontend live URL: https://safe-cycling-frontend.vercel.app
- Backend live API URL: https://safe-cycling-backend.vercel.app/api
- Vercel dashboard (build/deployment logs): https://vercel.com/dashboard

### 9.4 Quick Runtime Verification (Cloud)

- Open frontend live URL and navigate to dashboard after login.
- Reload on a client route such as `/dashboard` and confirm no 404 occurs.

## 10. Project Notes

- Leaflet default markers are explicitly configured with imported marker assets to avoid missing marker icons in hosted production builds.
- The application is intentionally delivered as a Vite SPA with client-side routing.

