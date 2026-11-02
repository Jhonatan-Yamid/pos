import { PrismaClient } from '@prisma/master-client'

if (!process.env.MASTER_DATABASE_URL) {
  throw new Error(
    'Missing required environment variable: MASTER_DATABASE_URL. ' +
    'The application cannot start without a connection to the master database.'
  )
}

const masterDbSingleton = () => {
  return new PrismaClient()
}

export const masterDb = globalThis.masterDb ?? masterDbSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.masterDb = masterDb
}

export default masterDb
