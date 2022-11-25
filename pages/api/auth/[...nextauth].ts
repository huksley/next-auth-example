import NextAuth, { NextAuthOptions, Profile } from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import GithubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
import Auth0Provider from "next-auth/providers/auth0";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/mongodb";
import { OAuthConfig } from "next-auth/providers";
import { signIn } from "next-auth/react";
import { Db } from "mongodb";
// import AppleProvider from "next-auth/providers/apple"
// import EmailProvider from "next-auth/providers/email"

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth?prompt=consent&response_type=code&access_type=offline";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export const authOptions: NextAuthOptions = {
  // https://next-auth.js.org/configuration/providers/oauth
  providers: [
    /* EmailProvider({
         server: process.env.EMAIL_SERVER,
         from: process.env.EMAIL_FROM,
       }),
    // Temporarily removing the Apple provider from the demo site as the
    // callback URL for it needs updating due to Vercel changing domains

    Providers.Apple({
      clientId: process.env.APPLE_ID,
      clientSecret: {
        appleId: process.env.APPLE_ID,
        teamId: process.env.APPLE_TEAM_ID,
        privateKey: process.env.APPLE_PRIVATE_KEY,
        keyId: process.env.APPLE_KEY_ID,
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    */
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      // Forces grant consent dialog all the time, but needed for refresh token
      // https://next-auth.js.org/tutorials/refresh-token-rotation
      authorization: GOOGLE_AUTH_URL,
    }),
    /*
    TwitterProvider({
      clientId: process.env.TWITTER_ID,
      clientSecret: process.env.TWITTER_SECRET,
    }),
    Auth0Provider({
      clientId: process.env.AUTH0_ID,
      clientSecret: process.env.AUTH0_SECRET,
      issuer: process.env.AUTH0_ISSUER,
    }),*/
  ],
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // Every 30 days
    updateAge: 24 * 60 * 60, // Every day
  },
  theme: {
    colorScheme: "dark",
  },
  callbacks: {
    async jwt({ token }) {
      token.userRole = "admin";
      return token;
    },
    async signIn({ user, profile, account }) {
      const client = await clientPromise;
      await client
        .db()
        .collection("appusers")
        .updateOne(
          {
            provider: 'google',
            providerAccountId: account?.providerAccountId
          },
          {
            $set: {
              ...user,
              ...profile,
              ...account,
              email: user.email
            },
          },
          { upsert: true }
        );
      // console.info("signIn callback user", user, "account", account);
      return true;
    },
  },
};

const handler = (req: NextApiRequest, res: NextApiResponse) => {
  const url = new URL(req.url!, process.env.NEXTAUTH_URL);
  const options = authOptions;
  if (url.pathname === "/api/auth/signin/google") {
    const additionalScopes = Array.isArray(req.query.add_scope)
      ? req.query.add_scope
      : typeof req.query.add_scope === "string"
      ? [req.query.add_scope]
      : undefined;
    const provider = options.providers.find((p) => p.id === "google") as OAuthConfig<Profile>;
    const otherProviders = options.providers.filter((p) => p.id !== "google");
    const defaultScopes = [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "openid",
    ];
    const scopes = Array.from(new Set([...defaultScopes, ...(additionalScopes || [])]));
    console.info("Login to Google with scopes", scopes, req.query);
    return NextAuth(req, res, {
      ...options,
      providers: [
        {
          ...provider,
          authorization: {
            url: GOOGLE_AUTH_URL,
            params: {
              login_hint: req.query.login_hint as string | undefined,
              ...(typeof provider.authorization === "object" ? provider.authorization.params : undefined),
              // https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#incrementalAuth
              scope: scopes.join(" "),
            },
          },
        },
        ...otherProviders,
      ],
    });
  }

  return NextAuth(req, res, options);
};

export default handler;
