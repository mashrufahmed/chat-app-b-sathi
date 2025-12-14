import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI as string);
export const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      isOnline: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
      lastSeen: {
        type: 'date',
        required: false,
        defaultValue: new Date(),
        input: false,
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET as string,
  baseURL: process.env.BASE_URL,
  trustedOrigins: [process.env.CLINT_URL as string],
});
