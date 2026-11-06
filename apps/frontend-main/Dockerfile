FROM node:22-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d AS builder
WORKDIR /usr/src/app
# copy root workspace manifests to resolve workspace packages
COPY package.json package-lock.json ./
# copy workspace packages and app source
COPY packages ./packages
COPY apps/frontend-main ./apps/frontend-main

# install all workspace dependencies (no audit to speed up)
RUN npm ci --no-audit --no-fund

WORKDIR /usr/src/app/apps/frontend-main
RUN npm run build

FROM node:22-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
# copy built app and node_modules from builder
COPY --from=builder /usr/src/app/apps/frontend-main /usr/src/app
COPY --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
EXPOSE 3000
CMD [ "npm", "run", "start" ]
