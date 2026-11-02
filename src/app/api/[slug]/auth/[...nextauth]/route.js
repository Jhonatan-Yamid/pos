import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { resolveTenantConfig } from "@/libs/tenantConfig";
import { getTenantDb } from "@/libs/tenantDb";

/**
 * Build NextAuth options scoped to a specific tenant slug.
 * Requirements: 6.1, 6.2, 6.3, 6.7, 6.8
 *
 * @param {string} slug - The tenant slug extracted from the URL params.
 * @returns {import("next-auth").AuthOptions}
 */
function buildAuthOptions(slug) {
  return {
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "text", placeholder: "jsmith" },
          password: {
            label: "Password",
            type: "password",
            placeholder: "*****",
          },
        },
        /**
         * Validate credentials against the tenant's own database (Req 6.1).
         * Returns generic error message for any failure (Req 6.8).
         * Disconnects the tenant DB client after the check (Req 2.5).
         */
        async authorize(credentials) {
          // Req 6.7: If slug not found in Master_DB, do not query Tenant_DB.
          const tenantConfig = await resolveTenantConfig(slug);
          if (!tenantConfig) {
            throw new Error("Credenciales inválidas");
          }

          const db = getTenantDb(tenantConfig);
          try {
            // Req 6.1: Query User table in this tenant's DB only.
            const userFound = await db.user.findUnique({
              where: { email: credentials.email },
            });

            // Req 6.8: Generic error — no hint about whether email or password failed.
            if (!userFound) throw new Error("Credenciales inválidas");

            const matchPassword = await bcrypt.compare(
              credentials.password,
              userFound.password
            );

            // Req 6.8: Same generic message for wrong password.
            if (!matchPassword) throw new Error("Credenciales inválidas");

            return {
              id: userFound.id,
              name: userFound.username,
              email: userFound.email,
              image: userFound.role,
            };
          } finally {
            // Req 2.5: Always disconnect the tenant client after the check.
            await db.$disconnect();
          }
        },
      }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
      // Req 5.1: Sign-in page is under the tenant's slug prefix.
      signIn: `/${slug}/auth/login`,
      // Req 6.8: Redirect auth errors back to the tenant's login page so
      // NextAuth never falls through to its built-in /api/auth/error route.
      error: `/${slug}/auth/login`,
    },
    callbacks: {
      /**
       * Embed the tenant slug in the JWT token (Req 6.2, 6.3).
       */
      async jwt({ token, user }) {
        if (user) {
          // On initial sign-in, persist the slug into the token.
          token.slug = slug;
          token.role = user.image; // role is stored in the image field
        }
        return token;
      },
      /**
       * Expose the slug on the session object so client components can read it.
       */
      async session({ session, token }) {
        if (token) {
          session.user.slug = token.slug;
          session.user.role = token.role;
          // Keep image field for backward compat with getRole() helper.
          session.user.image = token.role;
        }
        return session;
      },
    },
  };
}

/**
 * Next.js App Router route handler for NextAuth v4.
 *
 * NextAuth(options) returns a standard handler function.
 * We extract the slug from the request URL directly — NextAuth v4 does not
 * forward App Router params into the handler, so we cannot rely on context.params.
 *
 * URL shape: /api/[slug]/auth/[...nextauth]
 * e.g.       /api/hierbamala/auth/session
 *            segments: ['', 'api', 'hierbamala', 'auth', ...]
 *                       0     1         2           3
 */
async function handler(req, context) {
  // Extract slug from position [2] of the URL path segments.
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  // segments[0]='', segments[1]='api', segments[2]=slug
  const slug = segments[2] ?? '';

  const options = buildAuthOptions(slug);

  // NextAuth(options) returns the handler; invoke it with (req, context).
  return NextAuth(options)(req, context);
}

export { handler as GET, handler as POST };
