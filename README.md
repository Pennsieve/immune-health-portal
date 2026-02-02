# Immune Health Portal

Penn's Institute for Immunology & Immune Health (I3H) - Standardized Immune Profiling Portal.

## Tech Stack

- **Framework**: Nuxt 3 (Vue 3)
- **State Management**: Pinia
- **Authentication**: AWS Amplify (Cognito) - Pennsieve integration
- **CMS**: Contentful
- **Styling**: SCSS

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Setup

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment variables**

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

### Required Environment Variables

#### Pennsieve Authentication (AWS Cognito)

These are required for Pennsieve login functionality:

- `USER_POOL_ID` - AWS Cognito User Pool ID
- `USER_POOL_WEB_CLIENT_ID` - Cognito app client ID
- `OAUTH_DOMAIN` - Cognito OAuth domain
- `OAUTH_REDIRECT_SIGNIN` - OAuth redirect URL after login
- `OAUTH_REDIRECT_SIGNOUT` - OAuth redirect URL after logout

#### Contentful CMS (Optional)

For dynamic content management:

- `CONTENTFUL_SPACE_ID` - Your Contentful space ID
- `CONTENTFUL_ACCESS_TOKEN` - Content Delivery API token
- `CONTENTFUL_PREVIEW_TOKEN` - Content Preview API token (optional)

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck

# Lint
npm run lint
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

## Support

- **Partnerships**: lguercio@pennmedicine.upenn.edu
- **Billing**: khas@pennmedicine.upenn.edu
- **Technical**: See team contacts on the home page
