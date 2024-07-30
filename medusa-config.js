import { defineConfig, loadEnv } from '@medusajs/utils';

loadEnv(process.env.NODE_ENV, process.cwd())

const DB_USERNAME = process.env.DB_USERNAME
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_HOST = process.env.DB_HOST
const DB_PORT = process.env.DB_PORT
const DB_DATABASE = process.env.DB_DATABASE

const DATABASE_URL = 
  `postgres://${DB_USERNAME}:${DB_PASSWORD}` + 
  `@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`
  

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// const plugins = [
//   // ...
//   {
//     resolve: "@medusajs/admin",
//     /** @type {import('@medusajs/admin').PluginOptions} */
//     options: {
//       autoRebuild: true,
//       // other options...
//     },
//   },
// ]


module.exports = defineConfig({
  projectConfig: {
    databaseUrl: DATABASE_URL,
    database_extra: { ssl: { rejectUnauthorized: false } },
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    redis_url: REDIS_URL,
  },
  // plugins
})
