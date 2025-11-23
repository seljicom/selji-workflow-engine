SELJI Workflow Engine - Backend (Express + SQLite)

Files:
  server/index.js  - Express application with all API endpoints
  server/db.js     - SQLite initialization and helper functions

Endpoints wired for frontend:
  GET    /api/system/health
  GET    /api/settings
  GET    /api/settings/:section/:name
  PUT    /api/settings/:section/:name
  DELETE /api/settings/:section/:name

  GET    /api/config/paapi
  PUT    /api/config/paapi
  DELETE /api/config/paapi

  GET    /api/logs
  POST   /api/logs
  DELETE /api/logs/:id

  GET    /api/secrets
  GET    /api/secrets/:name
  PUT    /api/secrets/:name
  DELETE /api/secrets/:name

  POST   /api/paapi/get-items

Environment variables:
  SECRET_ENC_KEY     - required for secrets encryption (>=32 chars)
  PAAPI_PARTNER_TAG  - your Amazon partner/associate tag (required for PA API)
  PAAPI_MARKETPLACE  - e.g. www.amazon.com (optional, default)
  PAAPI_REGION       - e.g. us-east-1 (optional, default)
  PAAPI_HOST         - PA API host (optional, default webservices.amazon.com)

To run:
  1) Install dependencies:
       npm install express cors sqlite3
       # if on Node < 18, also:
       npm install node-fetch

  2) Start server:
       node server/index.js

  3) Ensure the frontend .env has:
       VITE_API_BASE_URL=http://localhost:4000
