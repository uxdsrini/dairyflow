# Privacy Policy Hosting

## Recommended path: Vercel

This repo already includes `vercel.json`, so the fastest route is to deploy the site to Vercel and use:

- `https://YOUR-DOMAIN/privacy-policy`

The route is backed by:

- `/Users/apple/Desktop/dairy copy/public/privacy-policy.html`

## What is already prepared

- Privacy policy HTML page: `public/privacy-policy.html`
- Friendly Vercel route: `/privacy-policy`
- Existing SPA fallback config kept in `vercel.json`

## Before deployment

Replace the placeholders in `public/privacy-policy.html`:

- support email
- business address
- support phone

## Vercel deployment options

### Option 1: Vercel Dashboard

1. Push this project to GitHub, GitLab, or Bitbucket.
2. Open Vercel and import the repository.
3. Let Vercel detect the Vite project.
4. Keep the build command as `npm run build`.
5. Keep the output directory as `dist`.
6. Deploy.
7. Open `https://YOUR-VERCEL-DOMAIN/privacy-policy` and verify the page loads.

### Option 2: Vercel CLI

Run from the project root:

```bash
npx vercel
```

For production deployment:

```bash
npx vercel --prod
```

After deployment, verify:

```text
https://YOUR-DOMAIN/privacy-policy
```

## After deployment

Paste the live privacy policy URL into:

- Play Console → `Policy and programs` → `App content` → `Privacy Policy`
- Play Console → `Store presence` / `Main store listing` support details if needed

