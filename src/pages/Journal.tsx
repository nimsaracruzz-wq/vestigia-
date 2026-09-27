import { SectionReveal as Reveal } from '../animation/SectionReveal';
import { RevealGroup } from "../animation/Reveal";
import { useEffect } from "react";
import { PageIntro } from '../animation/PageIntro';
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { m as motion, AnimatePresence } from "framer-motion";
import { journalArticles } from "../data";

import { SEOHead } from "../components/common/SEOHead";

export default function Journal() {
  const { articleId } = useParams<{ articleId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const readId = articleId || searchParams.get("read");

  // Find active article if query parameter `read` is provided
  const activeArticle = journalArticles.find((art) => art.id === Number(readId));

  const handleBackToList = () => {
    if (articleId) {
      navigate("/journal");
      return;
    }
    searchParams.delete("read");
    setSearchParams(searchParams);
  };

  const articleJsonLd = activeArticle ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": activeArticle.title,
    "description": activeArticle.excerpt,
    "image": activeArticle.image ? `https://thevestigia.com${activeArticle.image}` : "https://thevestigia.com/images/products/vestigia_logo.png",
    "publisher": { "@id": "https://thevestigia.com/#organization" },
    "mainEntityOfPage": `https://thevestigia.com/journal/${activeArticle.id}`
  } : {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "VESTIGIA® Journal — Luxury Fashion & Craftsmanship Stories",
    "description": "Editorial explorations of 280 GSM heavyweight cotton, Italian architectural design, and modern luxury streetwear.",
    "url": "https://thevestigia.com/journal",
    "isPartOf": { "@id": "https://thevestigia.com/#website" }
  };

  return (
    <div
      className="journal-page-shell"
    >
      <SEOHead
        title={activeArticle ? `${activeArticle.title} | VESTIGIA® Journal` : "VESTIGIA® Journal — Editorial & Craftsmanship Stories"}
        description={activeArticle ? activeArticle.excerpt : "Editorial explorations of 280 GSM heavyweight cotton, Italian architectural design, and modern luxury streetwear."}
        canonicalUrl={activeArticle ? `https://thevestigia.com/journal/${activeArticle.id}` : "https://thevestigia.com/journal/"}
        ogImage={activeArticle?.image ? `https://thevestigia.com${activeArticle.image}` : "https://thevestigia.com/images/products/vestigia_logo.png"}
        ogType={activeArticle ? "article" : "website"}
        jsonLd={articleJsonLd}
      />
      <AnimatePresence mode="wait">
        {activeArticle ? (
          /* Single Article Read View */
          <Reveal disabled as="article"
            key="article-view"
            className="single-article-container"
          >
            <button className="back-btn" onClick={handleBackToList} type="button">
              <ArrowLeft size={16} />
              <span>Back to Journal</span>
            </button>

            <PageIntro className="article-header">
              <div className="meta-row">
                <span>{activeArticle.date}</span>
                <span>•</span>
                <span className="read-time-flex">
                  <Clock size={12} /> {activeArticle.readTime}
                </span>
              </div>
              <h1>{activeArticle.title}</h1>
            </PageIntro>

            <div className="article-featured-image">
              <img src={activeArticle.image} alt={activeArticle.title} />
            </div>

            <div className="article-body-content">
              {activeArticle.content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <footer className="article-footer-signup">
              <h3>Enjoyed this story?</h3>
              <p>Sign up to our list to receive similar editorial pieces directly in your inbox.</p>
              <Link to="/?signup=true" className="primary-link dark">
                Subscribe to Vestigia
              </Link>
            </footer>
          </Reveal>
        ) : (
          /* Articles Listing View */
          <div
            key="list-view"
            className="journal-listing-container"
          >
            <PageIntro className="journal-header-section">
              <p>The Vestigia Journal</p>
              <h1>Stories and fabric essays</h1>
              <span>Explorations in design philosophy, textile guides, and minimal lifestyle packing keys.</span>
            </PageIntro>

            <RevealGroup className="journal-articles-list-grid">
              {journalArticles.map((article, index) => (
                <Reveal as="article"
                  className="journal-list-card"
                  key={article.id}
                >
                  <div className="card-image-wrapper">
                    <img src={article.image} alt={article.title} />
                  </div>
                  <div className="card-info">
                    <div className="meta-row">
                      <span>{article.date}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                    </div>
                    <h2>
                    <Link to={`/journal/${article.id}`}>{article.title}</Link>
                    </h2>
                    <p>{article.excerpt}</p>
                    <Link className="read-more-link" to={`/journal/${article.id}`}>
                      Read story <ArrowRight size={14} />
                    </Link>
                  </div>
                </Reveal>
              ))}
            </RevealGroup>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
