# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Environment Variables

Use environment variables so local development and cloud deployments can use different backends.

Local development (`.env` or `.env.development`):

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Vercel project settings (`Settings -> Environment Variables`):

- `VITE_API_BASE_URL=https://your-backend.vercel.app/api`

Notes:

- The frontend also supports `VITE_API_URL` for compatibility.
- If `/api` is missing in the value, it is appended automatically.
