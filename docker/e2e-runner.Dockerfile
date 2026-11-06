FROM mcr.microsoft.com/playwright:focal@sha256:2286c685f2be91dd3ee482f1a3d382af08c9a1049406c9f7b499aec6ad691a2c
WORKDIR /work

# Copy package files and install dependencies (includes playwright in root package.json)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Ensure Playwright browsers are installed
RUN npx playwright install --with-deps chromium

# Copy workspace into image
COPY . /work

CMD ["node", "/work/scripts/e2e-sso-upload.js"]
