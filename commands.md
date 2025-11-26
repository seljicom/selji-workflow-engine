# 🐳 SELJI Workflow Engine — Docker & Development Cheatsheet

A consolidated, organized, clean reference of all local development, production, cleanup, debugging, and maintenance commands used throughout the SELJI Workflow Engine workflow.

## 📦 Docker Cleanup & Maintenance

### Remove unused Docker volumes
```
docker volume prune
```

### (Optional) Full system cleanup
```
docker system prune -af
```

## 🧪 Development Environment (compose.dev)

### Stop & clean dev environment
```
docker compose -f compose.common.yml -f compose.dev.yml down --remove-orphans
```

### Build & start dev
```
docker compose -f compose.common.yml -f compose.dev.yml up --build
```

### Stop dev (no prune)
```
docker compose -f compose.common.yml -f compose.dev.yml down
```

## 🚀 Production Environment (compose.prod)

### Stop & clean prod
```
docker compose -f compose.common.yml -f compose.prod.yml down --remove-orphans
```

### Build & start prod (detached)
```
docker compose -f compose.common.yml -f compose.prod.yml up --build -d
```

### Stop prod
```
docker compose -f compose.common.yml -f compose.prod.yml down
```

## 📋 Logs & Debugging

```
docker logs selji-frontend-dev
docker logs selji-backend-dev
docker logs -f selji-backend-dev
docker logs -f selji-frontend-dev
docker exec -it selji-backend-dev sh
ls -lh /nasdb
```

## 🧹 Node Modules Cleanup

### PowerShell
```
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force server/node_modules
```

### Bash / macOS / Linux / WSL
```
rm -rf node_modules
rm -rf server/node_modules
```

## 🔧 Additional Useful Commands

```
docker restart $(docker ps -q)
docker container prune
docker ps
docker exec -it selji-backend-dev printenv
docker inspect selji-backend-dev --format='{{json .Mounts}}' | jq
```

## 🔍 Quick Troubleshooting Guide

```
docker compose -f compose.common.yml -f compose.dev.yml down --remove-orphans -v
docker system prune -af
docker compose -f compose.common.yml -f compose.dev.yml up --build
docker exec -it selji-backend-dev sh
ls -lh /nasdb
rm -rf node_modules
rm -rf server/node_modules
```