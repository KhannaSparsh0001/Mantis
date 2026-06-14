# Mantis - Human Developer Guide

Welcome! This is a quick cheat sheet to help you understand the codebase and start building features for the hackathon.

---

## ⚡ Quick Start (Cheat Sheet)

Run these commands in separate terminal windows:

*   **Run Backend API:**
    ```bash
    cd backend
    bun run dev
    ```
    *(Runs on `http://localhost:8000`)*

*   **Run Next.js Frontend:**
    ```bash
    cd frontend
    bun dev
    ```
    *(Runs on `http://localhost:3000`)*

---

## 🔌 How Frontend & Backend Connect

1.  **Ports:** The frontend (**Next.js**) runs on port `3000`. The backend (**Elysia**) runs on port `8000`.
2.  **CORS:** Elysia has CORS enabled to accept requests from `http://localhost:3000`.
3.  **Data Fetching:** The frontend components (like `DiagnosticAssistant.tsx`) make fetch requests directly to the Elysia API (`http://localhost:8000/api/...`).

---

## 🛠️ Where to Write Your Code

*   **Add a Page or Layout:** Go to `frontend/src/app/`. Next.js uses file-based routing:
    *   `/` → `src/app/page.tsx`
    *   `/products` → `src/app/products/page.tsx`
    *   `/diagnostics` → `src/app/diagnostics/page.tsx`
    *   `/dashboard` → `src/app/dashboard/page.tsx`
*   **Edit Styling / Colors:** Go to `frontend/src/app/globals.css`. You can use our custom Tailwind classes anywhere:
    *   `bg-mantis-green` (kelly green buttons/accents)
    *   `bg-mantis-green-light` (light green selected lists or status boxes)
    *   `bg-slate-50` (soft canvas background)
*   **Add API Endpoints:** Go to `backend/src/index.ts` and chain your new HTTP methods to Elysia.

---

## 🔍 Code Files to Check First

1.  **`frontend/src/components/DiagnosticAssistant.tsx`:** Handles the AI chatbot UI. Check here to see how messages are formatted and sent.
2.  **`backend/src/index.ts`:** The API entry point. Add your real diagnostics database query and AI logic here!
