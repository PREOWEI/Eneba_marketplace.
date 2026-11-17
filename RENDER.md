# Render deployment

The Eneba-inspired marketplace is deployed on Render using two Docker Web Services connected to MongoDB Atlas.

**Live application:** https://eneba-marketplace-wvt6.onrender.com

**Backend API:** https://eneba-backend-rmzm.onrender.com

**Backend health check:** https://eneba-backend-rmzm.onrender.com/api/health

Both services are deployed from the same GitHub repository. The existing MongoDB Atlas database is used without resetting or reseeding its collections.

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
## Checks and review

The following checks passed locally:
- 43 frontend tests.
- Frontend lint and production build.
- PHP index syntax validation.
- Authentication validation and marketplace tests.

### Deployment verification

The application has been successfully deployed to Render using Docker.

- **Frontend:** https://eneba-marketplace-wvt6.onrender.com
- **Backend:** https://eneba-backend-rmzm.onrender.com
- **Backend health check:** https://eneba-backend-rmzm.onrender.com/api/health

The frontend runs through Nginx, while the backend uses PHP 8.4 and Apache.

The backend health endpoint returned HTTP 200. The products API successfully retrieved data from MongoDB Atlas after configuring the required Render outbound IP ranges in Atlas Network Access.

The deployed marketplace has been checked for product loading, images, search and filtering.

### Known limitations

- Payments are simulated; no real payment processing occurs.
- Generated DEMO product codes are not redeemable.
- Authentication, Favorites persistence, order history and simulated checkout require separate live verification.
- PHP sessions are stored locally in the backend container and may be lost when the service restarts or redeploys.
- Local Docker builds have not been tested because Docker is not installed in the development environment.

### Future verification

After future deployments, verify the frontend health endpoint (`/healthz`), backend health endpoint (`/api/health`), product loading, images, navigation and direct page refreshes.

Also test registration, login, logout, Favorites and order history. Simulated checkout should only be tested when intending to create a demo order.

A successful health check confirms that the service is running but does not independently confirm MongoDB connectivity.

## References

- [Render Docker services](https://render.com/docs/docker)
- [Root directories in a monorepo](https://render.com/docs/monorepo-support)
- [Render port binding](https://render.com/docs/web-services#port-binding)
- [Blueprint specification](https://render.com/docs/blueprint-spec)
