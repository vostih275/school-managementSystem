# =============================================================================
# Production Dockerfile for AIC Lokichoggio School Management System
# ---------------------------------------------------------------------------
# Builds a single container that serves the backend API and the static
# frontend from the same Express server.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Stage frontend static assets
# ---------------------------------------------------------------------------
FROM node:18 AS frontend

WORKDIR /app/frontend

# Copy the entire static frontend (HTML, CSS, JS, images)
COPY frontend/ ./

# The frontend is plain HTML/CSS/JS so there is no npm build step.
# The `frontend/public` subfolder is a staging convention; move its contents
# to the root so logo.png and uploads map to the root public directory.
RUN if [ -d public ]; then \
        cp -r public/. . && rm -rf public; \
    fi

# Ensure a root `index.html` exists because the backend fallback serves it.
# This is the public entry point; all pages keep their original `/pages/*`
# URLs and `/css`, `/js`, `/images` assets.
RUN if [ -f ./pages/login.html ]; then \
        cp ./pages/login.html ./index.html; \
    else \
        echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/pages/login.html"></head></html>' > ./index.html; \
    fi

# ---------------------------------------------------------------------------
# Stage 2: Final production image
# ---------------------------------------------------------------------------
FROM node:18-slim

# Create app directory and set working directory
WORKDIR /app

# Install backend dependencies first (leverages Docker layer caching)
COPY backend/package*.json ./
RUN npm install --production && npm cache clean --force

# Copy backend source code
COPY backend/ ./

# Copy prepared frontend assets into the public directory that the Express
# server will serve via `express.static`.
COPY --from=frontend /app/frontend ./public

# Ensure the root uploads/download directories exist for runtime use
RUN mkdir -p ./public/uploads/report-cards ./public/downloads/report-cards ./public/assets

# Expose the port the app runs on (Render will set PORT env var)
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
