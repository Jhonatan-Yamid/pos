/**
 * Auth layout for /{slug}/auth/* routes.
 *
 * Exports generateMetadata so the browser receives the correct
 * tenant-specific manifest link even on unauthenticated pages
 * like /[slug]/auth/login.
 */
export async function generateMetadata({ params }) {
  const slug = (await params).slug ?? params.slug;
  return {
    manifest: `/${slug}/manifest.json`,
  };
}

export default function AuthLayout({ children }) {
  return children;
}
