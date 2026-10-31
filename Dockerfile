# Image unique : API + widget (w.js) + pages hébergées.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/widget/package.json apps/widget/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/widget/package.json apps/widget/
RUN npm ci --omit=dev && npm cache clean --force
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY data data
COPY --from=build /app/apps/widget/dist apps/widget/dist
USER node
EXPOSE 8787
CMD ["npm", "start"]
