// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxt/eslint',
    '@nuxtjs/supabase',
  ],

  supabase: {
    redirect: false,
  },

  css: [
    '~/assets/css/main.scss',
    '~/assets/css/variables.scss',
    '~/assets/css/admin.scss',
  ],

  app: {
    head: {
      title: 'Immune Health Portal | I3H',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Penn\'s Institute for Immunology & Immune Health - Standardized Immune Profiling Portal' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Dancing+Script:wght@600;700&display=swap'
        },
      ],
    },
  },

  runtimeConfig: {
    // Private keys (server-side only)
    siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    redcapApiUrl: process.env.REDCAP_API_URL || '',
    redcapApiToken: process.env.REDCAP_API_TOKEN || '',
    signingSecret: process.env.SIGNING_SECRET || '',
    mailersendApiKey: process.env.MAILERSEND_API_TOKEN || '',
    mailersendFromEmail: process.env.MAILERSEND_FROM_EMAIL || 'noreply@test-q3enl6k3n8042vwr.mlsender.net',
    mailersendFromName: process.env.MAILERSEND_FROM_NAME || 'Immune Health Portal',
    adminEmail: process.env.ADMIN_EMAIL || 'support@immunehealth.science',
    // Dev bypass: log emails to the server console instead of calling MailerSend
    emailsDisabled: process.env.DISABLE_EMAILS === 'true',

    public: {
      // Pennsieve API Configuration
      pennsieveApiHost: process.env.PENNSIEVE_API_HOST || 'https://api.pennsieve.net',
      pennsieveDiscoverApiHost: process.env.PENNSIEVE_DISCOVER_API_HOST || 'https://api.pennsieve.net/discover',

      // AWS Cognito Configuration
      userPoolId: process.env.USER_POOL_ID || '',
      userPoolWebClientId: process.env.USER_POOL_WEB_CLIENT_ID || '',
      oauthDomain: process.env.OAUTH_DOMAIN || '',
      oauthRedirectSignIn: process.env.OAUTH_REDIRECT_SIGNIN || 'http://localhost:3000',
      oauthRedirectSignOut: process.env.OAUTH_REDIRECT_SIGNOUT || 'http://localhost:3000',
      authenticationFlowType: process.env.AUTHENTICATION_FLOW_TYPE || 'USER_PASSWORD_AUTH',

      // Contentful CMS Configuration
      contentfulSpaceId: process.env.CONTENTFUL_SPACE_ID || '',
      contentfulAccessToken: process.env.CONTENTFUL_ACCESS_TOKEN || '',
      contentfulEnvironment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
      contentfulHost: process.env.CONTENTFUL_HOST || 'preview.contentful.com',



      // Application Configuration
      appDomain: process.env.APP_DOMAIN || 'localhost',
      deployEnv: process.env.DEPLOY_ENV || 'development',

      // Public lead form. Disabled by default until bot protection (reCAPTCHA)
      // is in place — every submission triggers billable emails. Re-enable by
      // setting LEAD_FORM_ENABLED=true. Enforced on both the page and the API.
      leadFormEnabled: process.env.LEAD_FORM_ENABLED === 'true',

      // ORCID Configuration (for federated login)
      orcidClientId: process.env.ORCID_CLIENT_ID || '',
      orcidApiHost: process.env.ORCID_API_HOST || 'https://sandbox.orcid.org',
    },
  },

  compatibilityDate: '2024-11-01',

  experimental: {
    appManifest: false,
  },
})
