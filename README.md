# Immune Health Portal

Penn's Institute for Immunology & Immune Health (I3H) - Standardized Immune Profiling Portal.

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd immune-health-portal
npm install

# Configure environment (DEV credentials pre-configured)
cp .env.example .env

# Start dev server
npm run dev
```

Open http://localhost:3000 and sign in with your Pennsieve credentials!

## Features

- **Service Catalog**: Browse I3H core services with Penn internal/academic external pricing
- **Project Intake**: Submit new project requests with detailed requirements
- **My Cohorts**: Manage and track research cohorts with sample data
- **Pennsieve Authentication**: Secure login with AWS Cognito integration
- **Dynamic Pricing**: Toggle between internal and external rates

## Tech Stack

- **Framework**: Nuxt 3 (Vue 3)
- **State Management**: Pinia
- **Authentication**: AWS Amplify (Cognito) - Pennsieve integration
- **CMS**: Contentful
- **Styling**: SCSS

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

**Using nvm (recommended for Node version management):**

```bash
nvm use 18
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

**Good news!** The `.env.example` file includes pre-configured **Pennsieve DEV credentials**, so you can start developing immediately without additional configuration.

### Pre-Configured Values (DEV Environment)

The following are already set in `.env.example`:

```bash
# Pennsieve DEV Cognito credentials
USER_POOL_ID=us-east-1_FVLhJ7CQA
USER_POOL_WEB_CLIENT_ID=703lm5d8odccu21pagcfjkeaea
OAUTH_DOMAIN=pennsieve-dev-users2.auth.us-east-1.amazoncognito.com

# API endpoints
PENNSIEVE_API_HOST=https://api.pennsieve.net
PENNSIEVE_API2_HOST=https://api2.pennsieve.net
```

**You don't need to modify anything** unless you want to:
- Use production Pennsieve credentials
- Configure Contentful CMS
- Enable ORCID OAuth login

### Optional Environment Variables

#### Contentful CMS (Optional)

For dynamic content management:

- `CONTENTFUL_SPACE_ID` - Your Contentful space ID
- `CONTENTFUL_ACCESS_TOKEN` - Content Delivery API token
- `CONTENTFUL_PREVIEW_TOKEN` - Content Preview API token

#### ORCID OAuth (Optional)

For federated login:

- `ORCID_CLIENT_ID` - ORCID application client ID
- `ORCID_API_HOST` - ORCID API endpoint (sandbox or production)

## Development

### Start the Dev Server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

### Other Commands

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck

# Lint
npm run lint

# Fix linting issues
npm run lint:fix
```

## Testing Authentication

### Login with Pennsieve Credentials

1. Navigate to http://localhost:3000
2. Click **"Sign In"** in the header
3. Enter your Pennsieve credentials

**Need credentials?**
- Create a Pennsieve account at [app.pennsieve.io](https://app.pennsieve.io)
- Or request **DEV environment** test credentials from your Pennsieve admin

### Supported Authentication Methods

- **Email/Password**: Standard login with Pennsieve credentials
- **Two-Factor Authentication (2FA)**: TOTP-based MFA if enabled on your account
- **ORCID Login**: Federated login via ORCID (when `ORCID_CLIENT_ID` is configured)

### Protected Routes

The following routes require authentication:

- `/dashboard` - My Cohorts page
- `/intake` - Project intake form

Unauthenticated users are automatically redirected to the home page.

### Verifying Authentication

After successful login:
- ✓ User menu appears in the header with your initials
- ✓ You can access `/dashboard` and `/intake` pages
- ✓ Auth token is stored in cookies
- ✓ Profile data is loaded from Pennsieve API

## Troubleshooting

### Port Already in Use

If port 3000 is busy, Nuxt will automatically try 3001, 3002, etc.

Or specify a custom port:
```bash
PORT=3001 npm run dev
```

### Node Version Issues

Ensure you're using Node 18 or higher:

```bash
node --version  # Should show v18.x.x or higher

# Using nvm:
nvm install 18
nvm use 18
rm -rf node_modules package-lock.json
npm install
```

### Authentication Errors

**"User pool client does not exist"**
- Clear browser cache and cookies
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Try an incognito/private window
- Verify your `.env` file matches `.env.example`

**"USER_SRP_AUTH is not enabled"**
- The `authFlowType` is now correctly configured
- If issues persist, clear browser auth state (see below)

### Clear Browser Auth State

To completely reset authentication:

1. Open DevTools (`F12` or `Cmd+Option+I`)
2. Go to **Application** → **Storage**
3. Click **Clear site data**
4. Check all boxes and click **Clear site data**
5. Reload the page

Or manually delete Cognito cookies:
1. DevTools → **Application** → **Cookies** → `http://localhost:3000`
2. Delete all cookies starting with `CognitoIdentityServiceProvider`

### Dev Server Won't Start

```bash
# Stop any existing processes
pkill -f "nuxt dev"

# Clean install
rm -rf node_modules .nuxt
npm install
npm run dev
```

## Project Structure

```
├── assets/css/          # Global styles and variables
├── components/
│   └── shared/          # Shared UI components (LoginDialog, UserMenu)
├── composables/         # Vue composables for auth and API calls
│   ├── useGetToken.ts   # Fetch auth token from Amplify
│   ├── useGetProfile.ts # Fetch user profile from Pennsieve
│   ├── useSendXhr.ts    # Generic HTTP request wrapper
│   └── useLoginModal.ts # Login modal state management
├── layouts/             # App layouts
├── middleware/          # Route middleware
│   └── auth.global.ts   # Global auth protection
├── pages/               # App pages
│   ├── index.vue        # Home page
│   ├── pipeline.vue     # Pipeline documentation
│   ├── services.vue     # Services & pricing
│   ├── dashboard.vue    # User cohorts dashboard (protected)
│   └── intake.vue       # Project intake form (protected)
├── plugins/
│   ├── amplify.client.ts # AWS Amplify initialization
│   └── contentful.ts     # Contentful client setup
├── stores/              # Pinia stores
│   ├── auth.ts          # Authentication state
│   ├── cohorts.ts       # User cohorts/studies
│   └── services.ts      # Service catalog
└── types/               # TypeScript type definitions
```

## Authentication Flow

The app uses AWS Amplify with Cognito for Pennsieve authentication:

1. User clicks "Sign In" or accesses a protected route
2. Login modal opens with email/password or ORCID options
3. On successful auth, tokens are stored in cookies
4. `useGetProfile` fetches user data from Pennsieve API
5. Auth state is managed in the Pinia auth store
6. Protected routes check auth state via middleware

## API Integration

### Pennsieve API

The app integrates with Pennsieve APIs for:

- User authentication and profile
- Organization/workspace management
- Data access (future)

### Contentful CMS

Optional CMS integration for managing:

- Hero content
- Team bios
- Service descriptions
- Pipeline step details

## Deployment

### Production Build

```bash
npm run build
```

The build output will be in `.output/` directory.

### Environment-Specific Configuration

Set `DEPLOY_ENV=production` for production deployments. This enables:

- Secure cookie storage
- Production API endpoints
- Analytics (if configured)

## Contributing

1. Create a feature branch
2. Make changes
3. Run linting: `npm run lint:fix`
4. Run type check: `npm run typecheck`
5. Submit PR

## Related Resources

- [Pennsieve Discover App 2](https://github.com/Pennsieve/pennsieve-discover-app2) - Reference implementation for Pennsieve authentication patterns
- [AWS Amplify v6 Documentation](https://docs.amplify.aws/gen1/javascript/)
- [Nuxt 3 Documentation](https://nuxt.com/docs)

## Support

- **Partnerships & Services**: lguercio@pennmedicine.upenn.edu
- **Billing Questions**: khas@pennmedicine.upenn.edu
- **Technical Support**: See team contacts on the home page
