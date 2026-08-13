---
description: How to push your project to GitHub on Windows
---

# Deploying to GitHub

It appears that `git` is currently not installed or recognized on your system. Follow these steps to get set up.

## Step 1: Install Git

1.  Download **Git for Windows** from [git-scm.com](https://git-scm.com/download/win).
2.  Run the installer. You can accept all the default settings (Just keep clicking "Next").
3.  **IMPORTANT**: Once installed, you must **restart your terminal/VS Code** for the changes to take effect. Close this window and reopen it.

## Step 2: Verify Installation

After restarting, run this command in your terminal:
```powershell
git --version
```
You should see something like `git version 2.x.x...`.

## Step 3: Initialize and Commit

Once Git is working, run these commands in your project folder:

```powershell
# 1. Initialize the repository
git init

# 2. Add your files
git add .

# 3. Create your first commit
git commit -m "Initial commit - Weekly Resource Scheduler v1.0.00"
```

## Step 4: Connect to GitHub

1.  Go to [GitHub.com](https://github.com) and create a **New Repository**.
2.  Name it `simple-timetable-planner` (or whatever you prefer).
3.  **Do not** add a README, gitignore, or license (we already have files).
4.  Copy the URL for your new repository (e.g., `https://github.com/YourUsername/simple-timetable-planner.git`).

## Step 5: Push your code

Back in your terminal, run these commands (replace the URL with your actual one):

```powershell
# 1. Rename branch to main (standard practice)
git branch -M main

# 2. Link your local repo to GitHub
git remote add origin https://github.com/YOUR_USERNAME/simple-timetable-planner.git

# 3. Push your code
git push -u origin main
```

> **Note**: If asked to sign in, follows the browser prompts to authenticate with your GitHub account.
