# Olympics PWA Mobile Access

## Production Access (Recommended)

Students should access the deployed Olympics PWA at the Vercel URL provided by the instructor. The PWA is designed to work on all mobile devices through the browser.

## Mobile Issues Troubleshooting

If you encounter "Failed to fetch" errors on mobile:

1. **Check your internet connection** - Ensure you have a stable internet connection
2. **Verify the URL** - Make sure you're accessing the correct Vercel deployment URL
3. **Try refreshing** - Close and reopen the browser/tab
4. **Check with instructor** - Verify the correct Vercel URL and ensure backend services are running

## Known Issues

### Backend Connection Errors
**IMPORTANT**: The deployed PWA requires a backend API to function. If you see "Failed to fetch" errors:

**For Instructors:**
- The backend needs to be deployed to Render first
- Follow the deployment guide in `/DEPLOYMENT.md`
- Ensure environment variables are configured on Render
- Update the frontend's production environment to point to your deployed backend

**For Students:**
- Contact your instructor if you encounter connection errors
- The backend service may be starting up - wait 1-2 minutes and refresh

### PWA Installation
To install as a PWA on mobile:
1. Open the URL in mobile browser
2. Look for "Add to Home Screen" option
3. Follow browser prompts to install

## For Developers Only

If you need to run a local development version (not recommended for students):