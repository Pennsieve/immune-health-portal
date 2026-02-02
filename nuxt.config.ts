// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxt/eslint',
  ],

  css: [
    '~/assets/css/main.scss',
    '~/assets/css/variables.scss',
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
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      // Pennsieve API Configuration
      pennsieveApiHost: process.env.PENNSIEVE_API_HOST || 'https://api.pennsieve.net',
      pennsieveApi2Host: process.env.PENNSIEVE_API2_HOST || 'https://api2.pennsieve.net',
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
      contentfulPreviewToken: process.env.CONTENTFUL_PREVIEW_TOKEN || '',
      contentfulEnvironment: process.env.CONTENTFUL_ENVIRONMENT || 'master',

      // Application Configuration
      appDomain: process.env.APP_DOMAIN || 'localhost',
      deployEnv: process.env.DEPLOY_ENV || 'development',
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',

      // ORCID Configuration (for federated login)
      orcidClientId: process.env.ORCID_CLIENT_ID || '',
      orcidApiHost: process.env.ORCID_API_HOST || 'https://sandbox.orcid.org',
    },
  },

  compatibilityDate: '2024-11-01',
})
