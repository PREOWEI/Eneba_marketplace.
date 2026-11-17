FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/19-validate-env.sh /docker-entrypoint.d/19-validate-env.sh
RUN chmod +x /docker-entrypoint.d/19-validate-env.sh
ENV PORT=10000
EXPOSE 10000
