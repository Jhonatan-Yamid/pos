import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { resolveTenantConfig } from "@/libs/tenantConfig";
import { getTenantDb } from "@/libs/tenantDb";

/**
 * Standard NextAuth route handler at /api/auth/[...nextauth].
 *
 * Multi-tenancy is achieved by:
 *   1. The login page passes `slug` as an extra credentials field.
 *   2. `authorize()` reads `credentials.slug` to resolve the correct tenant DB.
 *   3. The `jwt` callback embeds `token.slug` so the middleware can verify
 *      that the session matches the requested tenant URL.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.7, 6.8
 */
const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "text"     },
        password: { label: "Password", type: "password" },
        slug:     { label: "Slug",     type: "text"     },
      },

      async authorize(credentials) {
        const slug = credentials?.slug ?? "";

        const tenantConfig = await resolveTenantConfig(slug);
        if (!tenantConfig) throw new Error("Credenciales inválidas");

        const db = getTenantDb(tenantConfig);
        try {
          const userFound = await db.user.findUnique({
            where: { email: credentials.email },
          });
          if (!userFound) throw new Error("Credenciales inválidas");

          const matchPassword = await bcrypt.compare(
            credentials.password,
            userFound.password
          );
          if (!matchPassword) throw new Error("Credenciales inválidas");

          return {
            id:    userFound.id,
            name:  userFound.username,
            email: userFound.email,
            image: userFound.role,
            slug,
          };
        } finally {
          await db.$disconnect();
        }
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    error: "/auth/error",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.slug = user.slug;
        token.role = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.slug  = token.slug;
        session.user.role  = token.role;
        session.user.image = token.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
