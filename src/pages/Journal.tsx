import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { journalArticles } from "../data";

export default function Journal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const readId = searchParams.get("read");

  // Find active article if query parameter `read` is provided
  const activeArticle = journalArticles.find((art) => art.id === Number(readId));

  // Sync title
  useEffect(() => {
    if (activeArticle) {
      document.title = `${activeArticle.title} | Journal | Vestigia`;
    } else {
      document.title = "Journal Stories | Vestigia";
    }
  }, [activeArticle]);

  const handleBackToList = () => {
    searchParams.delete("read");
    setSearchParams(searchParams);
  };

  return (
    <motion.div
      className="journal-page-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence mode="wait">
        {activeArticle ? (
          /* Single Article Read View */
          <motion.article
            key="article-view"
            className="single-article-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
          >
            <button className="back-btn" onClick={handleBackToList} type="button">
              <ArrowLeft size={16} />
              <span>Back to Journal</span>
            </button>

            <header className="article-header">
              <div className="meta-row">
                <span>{activeArticle.date}</span>
                <span>•</span>
                <span className="read-time-flex">
                  <Clock size={12} /> {activeArticle.readTime}
                </span>
              </div>
              <h1>{activeArticle.title}</h1>
            </header>

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
          </motion.article>
        ) : (
          /* Articles Listing View */
          <motion.div
            key="list-view"
            className="journal-listing-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <header className="journal-header-section">
              <p>The Vestigia Journal</p>
              <h1>Stories and fabric essays</h1>
              <span>Explorations in design philosophy, textile guides, and minimal lifestyle packing keys.</span>
            </header>

            <div className="journal-articles-list-grid">
              {journalArticles.map((article, index) => (
                <motion.article
                  className="journal-list-card"
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
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
                      <Link to={`?read=${article.id}`}>{article.title}</Link>
                    </h2>
                    <p>{article.excerpt}</p>
                    <Link className="read-more-link" to={`?read=${article.id}`}>
                      Read story <ArrowRight size={14} />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
