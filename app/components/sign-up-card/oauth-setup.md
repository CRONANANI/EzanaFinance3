# OAuth Setup Guide for Sign-Up Page

This guide will help you configure Google and Facebook OAuth for the sign-up page.

## Google OAuth Setup

### 1. Create Google OAuth Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:8000/sign-up.html` (for development)
   - `https://yourdomain.com/sign-up.html` (for production)
7. Copy the Client ID

### 2. Update Configuration
Replace `YOUR_GOOGLE_CLIENT_ID` in `sign-up-card.js` with your actual Google Client ID:

```javascript
const OAUTH_CONFIG = {
    google: {
        clientId: 'your-actual-google-client-id.apps.googleusercontent.com',
        redirectUri: window.location.origin + '/sign-up.html'
    },
    // ...
};
```

## Facebook OAuth Setup

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs:
   - `http://localhost:8000/sign-up.html` (for development)
   - `https://yourdomain.com/sign-up.html` (for production)
5. Copy the App ID

### 2. Update Configuration
Replace `YOUR_FACEBOOK_APP_ID` in `sign-up-card.js` with your actual Facebook App ID:

```javascript
const OAUTH_CONFIG = {
    facebook: {
        appId: 'your-actual-facebook-app-id'
    }
};
```

## Environment Variables (Recommended)

For production, consider using environment variables:

```javascript
const OAUTH_CONFIG = {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        redirectUri: window.location.origin + '/sign-up.html'
    },
    facebook: {
        appId: process.env.FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID'
    }
};
```

## Testing

1. Start your development server
2. Navigate to the sign-up page
3. Click "Sign up with Google" or "Sign up with Facebook"
4. Complete the OAuth flow
5. Verify that user data is captured correctly

## Security Notes

- Never commit OAuth credentials to version control
- Use environment variables in production
- Implement proper server-side validation
- Set up proper CORS policies
- Use HTTPS in production

## Troubleshooting

### Google OAuth Issues
- Ensure the redirect URI matches exactly
- Check that the Google+ API is enabled
- Verify the client ID is correct

### Facebook OAuth Issues
- Ensure the app is in "Live" mode for production
- Check that the redirect URI is added to the app settings
- Verify the app ID is correct
- Make sure the Facebook SDK is loaded properly

## Backend Integration

The OAuth flow currently stores user data in localStorage for demo purposes. In production, you should:

1. Send the OAuth data to your backend
2. Verify the OAuth tokens server-side
3. Create or update user accounts
4. Return a secure session token
5. Store the session token in a secure HTTP-only cookie
