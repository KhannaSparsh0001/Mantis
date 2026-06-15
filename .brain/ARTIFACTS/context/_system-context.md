# System Context

## Project Identity
Project: Mantis
Root: /home/fev/GitRepos/Mantis

## Current State
- Initialized via bootstrap workflow
- Moss SDK integrated for semantic search on product manuals
- Two primary API flows: upload-manual (PDF→Moss index) and diagnose/ask (Moss query→Gemini)
- Bootstrap structure created: .brain/ with ARTIFACTS, CHANGES

## Notes for Next Agent
- Bootstrap complete
- Moss integration lives in backend/src/moss/client.ts
- Product routes in backend/src/routes/product.ts
- No active plans or tasks yet
