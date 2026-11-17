# Render deployment

Prepared for review; no services have been deployed and no database changes are part of the build/start process.

## Architecture

Create two **Docker Web Services** from the same GitHub repository. The frontend builds React with Node 24, then Nginx serves dist and proxies /api/ to the PHP service over HTTPS. The backend uses PHP 8.4 with Apache, MongoDB extension 2.5.0 and locked Composer dependencies.

The browser uses only the frontend origin. Existing relative /api URLs, session cookies and image paths keep working. No frontend API-base environment variable or permissive CORS headers are needed. Do not point browser requests directly at the backend. Nginx preserves request bodies, query strings and cookies; its SPA fallback handles direct links and refreshes on /product/..., /favorites, /orders and other React routes.

## Render settings

Create the backend first, then copy its actual HTTPS URL into the frontend environment. Choose the same region for both services. Select the repository branch containing these files.

| Setting | Backend | Frontend |
| --- | --- | --- |
| Service type | Web Service | Web Service |
| Runtime | Docker | Docker |
| Root Directory | backend | frontend |
| Dockerfile Path | ./Dockerfile | ./Dockerfile |
| Docker Build Context | . | . |
| Build Command | Leave unset; Dockerfile installs Composer dependencies | Leave unset; Dockerfile runs npm ci and npm run build |
| Docker Command / Start override | Leave unset; uses start-marketplace | Leave unset; uses the Nginx image entrypoint |
| Publish Directory | Not applicable | Not applicable; not a Static Site |
| Health Check Path | /api/health | /healthz |

Render assigns PORT; both services listen on it on all interfaces. The default inside the images is 10000. Do not set build-time database secrets. Add MongoDB credentials only to the backend's runtime environment in Render.

Alternatively, render.yaml defines the same services as a Blueprint. Its sync:false fields prompt for values. Names may need adjustment for availability; BACKEND_URL must match the actual backend service URL. Importing a Blueprint starts deployment, so do that only after reviewing the configuration.

## Environment variables

Backend:

- MONGODB_URI: your existing Atlas connection string, entered privately in Render.
- MONGODB_DATABASE: the exact existing database name. Optional in code, but set it explicitly to avoid selecting the wrong database.
- APP_ENV=production: included in the Dockerfile and Blueprint. Makes the session cookie Secure even though Render terminates HTTPS before forwarding HTTP to Apache.
- PORT: supplied by Render.

Frontend:

- BACKEND_URL: the backend's actual HTTPS origin, for example https://YOUR-API-SERVICE.onrender.com. No /api path or trailing slash. This is runtime configuration, not a secret.
- PORT: supplied by Render.
- No VITE_* API variable and no database credentials.

Docker ignore files exclude .env files and installed local dependencies. The backend image copies only explicit application inputs and does not contain diagnostic scripts or seeders. Existing backend/.env is untouched.

## MongoDB and sessions

Before deployment, add the backend service's documented outbound IP ranges from Render to Atlas Network Access and ensure its database user can access the existing database. This preparation does not seed, reset or migrate collections.

PHP sessions remain file-based on the backend container. Use one backend instance; sessions can be lost on restart/redeploy, requiring login again. Accounts, Favorites and orders remain in Atlas. Horizontal scaling would require shared session storage, which is outside this deployment change.

## Checks and review

Passed locally: 43 frontend tests, lint, production build, PHP index syntax, authentication validation and marketplace tests.

Docker is not installed in the current workspace, so actual image builds, Apache/Nginx container startup and Render-to-Atlas connectivity remain unverified. Once Docker is available, from the repository root:

~~~powershell
docker build -t eneba-api ./backend
docker build -t eneba-storefront ./frontend
~~~

The builds do not require Atlas credentials and do not access or modify MongoDB.

After you choose to deploy, verify the frontend /healthz and /api/health URLs, product loading and image loading, then refresh a product URL. Manually check login/logout, Favorites and order history. A simulated checkout writes a demo order, so run that only when you intend to test it. A passing health check does not prove Atlas connectivity.

## References

- [Render Docker services](https://render.com/docs/docker)
- [Root directories in a monorepo](https://render.com/docs/monorepo-support)
- [Render port binding](https://render.com/docs/web-services#port-binding)
- [Blueprint specification](https://render.com/docs/blueprint-spec)
