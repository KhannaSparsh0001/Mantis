@echo off
echo Starting Mantis Backend and Frontend...

:: Start the Backend in a new command window
start "Mantis Backend" cmd /k "cd backend && bun run dev"

:: Start the Frontend in a new command window
start "Mantis Frontend" cmd /k "cd frontend && bun dev"

echo Both processes started! Feel free to close this window.
