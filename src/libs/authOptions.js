/**
 * Minimal shared authOptions for server components that need to check
 * the current session without a specific tenant context (e.g. admin layout,
 * root Navbar).
 *
 * This does NOT handle credential authorization — that lives in the per-tenant
 * route at src/app/api/[slug]/auth/[...nextauth]/route.js.
 * It only provides the JWT/session callbacks and secret needed by
 * getServerSession() to decode an existing session token.
 */
export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [],
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
        session.user.slug = token.slug;
        session.user.role = token.role;
        session.user.image = token.role;
      }
      return session;
    },
  },
};