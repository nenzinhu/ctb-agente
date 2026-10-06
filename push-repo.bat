@echo off
rem ===========================================================
rem  Push do repositório ctb-agente para o GitHub
rem  Uso: clique duas vezes ou rode no prompt
rem ============================================================

setlocal

echo.
echo  ============================================
echo  Pushing CTB Agente to GitHub
echo  ============================================
echo.
cd /d "%~dp0"

echo [1/4] Checking git configuration...
git config user.name >nul 2>&1
if errorlevel 1 (
    echo [ERRO] user.name not configured
    git config --global user.name "nenzinhu"
    echo [OK] user.name set to "nenzinhu"
)
git config user.email >nul 2>&1
if errorlevel 1 (
    echo [ERRO] user.email not configured
    git config --global user.email "treejeferson@gmail.com"
    echo [OK] user.email set to "treejeferson@gmail.com"
)

echo [2/4] Checking for uncommitted changes...
git stash -q 2>nul
if errorlevel 1 (
    echo [WARN] Could not stash changes. You may need to commit manually.
)

echo [3/4] Fetching latest from origin...
git fetch origin master 2>nul
if errorlevel 1 (
    echo [ERR] Failed to fetch origin.
)

echo [4/4] Pulling latest... (this may take a while)
git pull --rebase origin master 2>nul
if errorlevel 1 (
    echo [WARN] Pull failed. Continuing with local changes.
)

echo.
echo === Staging and committing ===
echo.
git add -A
if errorlevel 1 (
    echo [ERRO] git add failed.
    exit /b 1
)

if defined GITHUB_TOKEN (
    git commit -m "fix: correct AI provider constructors, API key handling, and fallback chain" 2>nul
) else (
    git commit -m "fix: correct AI provider constructors, API key handling, and fallback chain" 2>nul
    if errorlevel 1 (
        echo [INFO] Nothing to commit (no changes).
        goto :done
    )
)

echo.
echo === Pushing to origin/master ===
echo.
git push -u origin master

if errorlevel 1 (
    echo.
    echo [ERRO] Push failed. Check your GitHub connection and credentials.
    echo [INFO] Make sure you have pushed before, or use: git push -u origin master
) else (
    echo.
    echo [OK] Push completed successfully!
)

:done
echo.
echo === Cleanup ===
git stash pop -q 2>nul
echo [OK] Done.
pause
