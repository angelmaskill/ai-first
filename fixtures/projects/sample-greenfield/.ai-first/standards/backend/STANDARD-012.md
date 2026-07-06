---
id: STANDARD-012
domain: backend
title: Backend API Design
stability: stable
severity: must
relatedPaths:
  - src/backend/
---

# Backend API Design

All backend endpoints must:
- Use unified error codes (`E_*` enum)
- Validate input with a schema library
- Return RESTful paths (`/api/<resource>/<action>`)
