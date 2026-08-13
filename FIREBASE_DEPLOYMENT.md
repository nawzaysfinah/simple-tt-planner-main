# Firebase Hosting Deployment Guide

This guide provides step-by-step instructions to deploy your Simple Timetable Planner application to Firebase Hosting.

## Prerequisites

- Node.js and npm installed (already satisfied)
- A Google account for Firebase
- Firebase CLI installed globally

---

## Step 1: Install Firebase CLI

If you haven't already installed the Firebase CLI, run:

```bash
npm install -g firebase-tools
```

Verify the installation:

```bash
firebase --version
```

---

## Step 2: Login to Firebase

Authenticate with your Google account:

```bash
firebase login
```

This will open a browser window for you to sign in with your Google account.

---

## Step 3: Initialize Firebase in Your Project

Navigate to your project directory (if not already there):

```bash
cd c:\Users\highe\OneDrive\Documents\Projects\simple-timetable-planner
```

Initialize Firebase:

```bash
firebase init
```

During initialization, you'll be prompted with several questions:

### Configuration Answers:

1. **Which Firebase features do you want to set up?**
   - Select: `Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys`
   - Use arrow keys and spacebar to select, then press Enter

2. **Please select an option:**
   - Choose either:
     - `Use an existing project` (if you already have a Firebase project)
     - `Create a new project` (to create a new Firebase project)

3. **What do you want to use as your public directory?**
   - Enter: `build`
   - This is where Create React App outputs the production build

4. **Configure as a single-page app (rewrite all urls to /index.html)?**
   - Enter: `Yes` (or `y`)
   - This is important for React Router to work correctly

5. **Set up automatic builds and deploys with GitHub?**
   - Enter: `No` (or `n`) for now
   - You can set this up later if needed

6. **File build/index.html already exists. Overwrite?**
   - Enter: `No` (or `n`)
   - This prevents overwriting your built files

---

## Step 4: Build Your React Application

Create a production-optimized build of your application:

```bash
npm run build
```

This command:
- Creates a `build` folder
- Optimizes and minifies your code
- Prepares static assets for deployment

> **Note:** The build process may take 1-2 minutes depending on your project size.

---

## Step 5: Deploy to Firebase

Deploy your application to Firebase Hosting:

```bash
firebase deploy
```

After deployment completes, you'll see output similar to:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
Hosting URL: https://your-project-id.web.app
```

Your application is now live! 🎉

---

## Step 6: Access Your Deployed Application

Open the Hosting URL provided in the deployment output in your browser:

```
https://your-project-id.web.app
```

Or if you configured a custom domain:

```
https://your-project-id.firebaseapp.com
```

---

## Updating Your Deployment

Whenever you make changes to your application:

1. **Rebuild the application:**
   ```bash
   npm run build
   ```

2. **Deploy the updated build:**
   ```bash
   firebase deploy
   ```

---

## Quick Deployment Script

For convenience, you can add a deployment script to your `package.json`:

```json
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject",
  "deploy": "npm run build && firebase deploy"
}
```

Then you can deploy with a single command:

```bash
npm run deploy
```

---

## Additional Firebase Hosting Features

### Preview Deployments

Test your changes before deploying to production:

```bash
firebase hosting:channel:deploy preview
```

### View Deployment History

```bash
firebase hosting:releases:list
```

### Rollback to Previous Version

```bash
firebase hosting:rollback
```

### Custom Domain Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Hosting** → **Add custom domain**
4. Follow the instructions to verify domain ownership and configure DNS

---

## Troubleshooting

### Issue: "Firebase command not found"

**Solution:** Ensure Firebase CLI is installed globally:
```bash
npm install -g firebase-tools
```

### Issue: "Permission denied" errors

**Solution:** Run the command prompt as Administrator or use:
```bash
firebase login --reauth
```

### Issue: 404 errors on page refresh

**Solution:** Ensure `firebase.json` has the correct rewrite rule:
```json
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Issue: Build folder is empty

**Solution:** Run `npm run build` before deploying

---

## Files Created by Firebase Init

After initialization, you'll have these new files:

- `.firebaserc` - Stores your Firebase project configuration
- `firebase.json` - Firebase Hosting configuration
- `.firebase/` - Cache directory (add to `.gitignore`)

---

## Best Practices

1. **Always build before deploying:**
   ```bash
   npm run build && firebase deploy
   ```

2. **Test locally before deploying:**
   ```bash
   npm start
   ```

3. **Use preview channels for testing:**
   ```bash
   firebase hosting:channel:deploy staging
   ```

4. **Add `.firebase` to `.gitignore`:**
   ```
   .firebase/
   ```

5. **Monitor your hosting usage** in the Firebase Console to stay within free tier limits

---

## Firebase Free Tier Limits

Firebase Hosting free tier (Spark Plan) includes:

- **Storage:** 10 GB
- **Data Transfer:** 360 MB/day
- **Custom domain:** Supported
- **SSL certificate:** Free and automatic

For most small to medium applications, the free tier is sufficient.

---

## Support and Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firebase Status Dashboard](https://status.firebase.google.com/)

---

## Summary

**Quick deployment steps:**

```bash
# One-time setup
npm install -g firebase-tools
firebase login
firebase init

# Every deployment
npm run build
firebase deploy
```

Your Simple Timetable Planner is now hosted on Firebase! 🚀
