export const apiConfig = {
  plaid: {
    clientId: process.env.PLAID_CLIENT_ID || "",
    secret: process.env.PLAID_SECRET || "",
    env: (process.env.PLAID_ENV || "sandbox") as "sandbox" | "development" | "production",
  },
  finnhub: {
    apiKey: process.env.FINNHUB_API_KEY || "",
    baseUrl: "https://finnhub.io/api/v1",
  },
  quiver: {
    apiKey: process.env.QUIVER_API_KEY || "",
    baseUrl: "https://api.quiverquant.com/beta",
  },
  alphaVantage: {
    apiKey: process.env.ALPHA_VANTAGE_API_KEY || "UM530SUY02FGEJ1G",
    baseUrl: "https://www.alphavantage.co/query",
  },
  fmp: {
    apiKey: process.env.FMP_API_KEY || "KtI6Q5fak2JMGRWi0tUK7J8s6ktuDEgd",
    baseUrl: "https://financialmodelingprep.com/api",
  },
  newsApi: {
    apiKey: process.env.NEWS_API_KEY || "3a5e9503ab6849d19c70f4a9aa868587",
    baseUrl: "https://newsapi.org/v2",
  },
  fred: {
    apiKey: process.env.FRED_API_KEY || "",
    baseUrl: "https://api.stlouisfed.org",
  },
  iexCloud: {
    apiKey: process.env.IEX_CLOUD_API_KEY || "",
    baseUrl: "https://cloud.iexapis.com/stable",
  },
  polygon: {
    apiKey: process.env.POLYGON_API_KEY || "",
    baseUrl: "https://api.polygon.io",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.FROM_EMAIL || "notifications@ezanafinance.com",
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || "",
  },
  redis: {
    url: process.env.REDIS_URL || "",
  },
};
