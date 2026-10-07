import { Link } from "react-router-dom";
import { SEOHead } from "../components/common/SEOHead";
import { absoluteUrl } from "../utils/seo";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import { PageIntro } from "../animation/PageIntro";
import "./not-found.css";

export default function NotFound() {
  return (
    <div className="vestigia-not-found">
      <SEOHead
        title="Page Not Found | VESTIGIA"
        description="The requested VESTIGIA page could not be found."
        canonicalUrl={absoluteUrl("/404")}
        noIndex
        noFollow
      />
      <PageIntro as="div" className="not-found-content">
        <span className="not-found-eyebrow">VESTIGIA · A moment off course</span>
        <div className="not-found-art" aria-hidden="true">
          <span>404</span>
          <img src="/images/vestigia_head-320.png" alt="" width={160} height={160} />
        </div>
        <h1>A different path awaits.</h1>
        <p>This page is no longer here. Discover something enduring in the collection, or find your way home.</p>
        <div className="not-found-actions">
          <Link to="/shop" className="not-found-shop">Explore the collection <ArrowUpRight size={18} aria-hidden="true" /></Link>
          <Link to="/" className="not-found-home"><ArrowLeft size={16} aria-hidden="true" /> Back to home</Link>
        </div>
        <div className="not-found-assistance"><span>Looking for something specific?</span><Link to="/contact">Contact our concierge <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
      </PageIntro>
    </div>
  );
}
