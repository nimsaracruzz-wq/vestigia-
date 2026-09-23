import { Link } from "react-router-dom";
import { SEOHead } from "../components/common/SEOHead";
import { absoluteUrl } from "../utils/seo";

export default function NotFound() {
  return (
    <main className="product-not-found-container">
      <SEOHead
        title="Page Not Found | VESTIGIA"
        description="The requested VESTIGIA page could not be found."
        canonicalUrl={absoluteUrl("/404")}
        noIndex
        noFollow
      />
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or has been moved.</p>
      <Link to="/shop" className="primary-link dark">
        Back to Shop
      </Link>
    </main>
  );
}
