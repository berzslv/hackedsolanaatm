# Netlify Deployment Instructions

This document provides step-by-step instructions for deploying the Hacked ATM Token dApp to Netlify.

## Prerequisites

1. A Netlify account
2. Git repository with your code
3. Node.js and npm installed locally

## Deployment Steps

### 1. Prepare Your Repository

Make sure your repository is up to date with all the changes.

### 2. Connect to Netlify

1. Log in to your Netlify account
2. Click "New site from Git"
3. Choose your Git provider (GitHub, GitLab, or Bitbucket)
4. Select your repository
5. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

### 3. Environment Variables

Add the following environment variables in the Netlify UI:

- `VITE_API_URL`: Use this for overriding API endpoints if needed
- `ANCHOR_VERSION`: Set to `0.26.0` to ensure compatibility
- `SOLANA_CLUSTER`: Set to `devnet` or `mainnet-beta` based on your needs

### 4. Deploy Functions

The Netlify Functions are located in the `netlify/functions` directory and will be automatically deployed.

### 5. Troubleshooting

If you encounter issues with the Anchor version:

1. Check that the `netlify/functions/package.json` file specifies version 0.26.0 of @coral-xyz/anchor
2. Ensure that the Cargo.toml and Anchor.toml files are consistent with version 0.26.0
3. In the Netlify UI, go to Build & Deploy > Environment > Environment variables and add `ANCHOR_VERSION=0.26.0`

## Testing Locally

To test the Netlify Functions locally:

1. Install the Netlify CLI:
   ```
   npm install netlify-cli -g
   ```

2. Run the local development server:
   ```
   netlify dev
   ```

This will start a local server that serves both your frontend and the Netlify Functions.

## Updating Your Deployment

After making changes to your code:

1. Push your changes to the Git repository
2. Netlify will automatically trigger a new build and deployment

## Monitoring

Monitor your deployment in the Netlify UI:

1. Functions: See logs and execution metrics
2. Deploys: View build logs and deployment history
3. Analytics: Track site performance and usage

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Anchor Documentation](https://www.anchor-lang.com/)