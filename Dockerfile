FROM node:24.21.0-bookworm-slim AS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /plugin
RUN chown node:node /plugin
USER node
COPY --chown=node:node package.json package-lock.json ./
# Root prepare needs source. Build it explicitly after the source copy.
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 npm ci --ignore-scripts --no-audit --no-fund
FROM dependencies AS tools
COPY --chown=node:node . .
CMD ["bash"]
