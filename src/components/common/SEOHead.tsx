import React, { useEffect } from "react";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_URL, type JsonLd } from "../../utils/seo";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: "website" | "product" | "article";
  keywords?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  jsonLd?: JsonLd | JsonLd[];
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = "VESTIGIA | Luxury Clothing & Premium Essentials",
  description = "Discover VESTIGIA Aurelius Oversized T-Shirts. Crafted with 280 GSM heavyweight cotton, Italian design principles, and artisan precision.",
  canonicalUrl = `${SITE_URL}/`,
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt = "VESTIGIA brand emblem",
  ogType = "website",
  keywords,
  noIndex = false,
  noFollow = false,
  jsonLd,
}) => {
  const fullTitle = title.includes("VESTIGIA") ? title : `${title} | VESTIGIA`;
  const normalizedCanonical = absoluteUrl(canonicalUrl);
  const normalizedOgImage = absoluteUrl(ogImage);
  const robots = `${noIndex ? "noindex" : "index"}, ${noFollow ? "nofollow" : "follow"}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`;
  const jsonLdPayload = JSON.stringify(jsonLd ?? null);

  useEffect(() => {
    document.title = fullTitle;

    const setMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    setMetaTag('meta[name="description"]', "name", "description", description);
    setMetaTag('meta[name="robots"]', "name", "robots", robots);

    let keywordsMeta = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
    if (keywords) {
      if (!keywordsMeta) {
        keywordsMeta = document.createElement("meta");
        keywordsMeta.setAttribute("name", "keywords");
        document.head.appendChild(keywordsMeta);
      }
      keywordsMeta.setAttribute("content", keywords);
    } else if (keywordsMeta) {
      keywordsMeta.remove();
    }

    setMetaTag('meta[property="og:site_name"]', "property", "og:site_name", "VESTIGIA");
    setMetaTag('meta[property="og:type"]', "property", "og:type", ogType);
    setMetaTag('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", description);
    setMetaTag('meta[property="og:url"]', "property", "og:url", normalizedCanonical);
    setMetaTag('meta[property="og:image"]', "property", "og:image", normalizedOgImage);
    setMetaTag('meta[property="og:image:alt"]', "property", "og:image:alt", ogImageAlt);
    setMetaTag('meta[property="og:locale"]', "property", "og:locale", "en_US");

    setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMetaTag('meta[name="twitter:site"]', "name", "twitter:site", "@vestigia_official");
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", normalizedOgImage);

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", normalizedCanonical);

    const scriptId = "vestigia-jsonld-schema";
    let scriptElement = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptElement) {
        scriptElement = document.createElement("script");
        scriptElement.id = scriptId;
        scriptElement.type = "application/ld+json";
        document.head.appendChild(scriptElement);
      }
      scriptElement.text = JSON.stringify(jsonLd);
    } else if (scriptElement) {
      scriptElement.remove();
    }
  }, [fullTitle, description, normalizedCanonical, normalizedOgImage, ogImageAlt, ogType, keywords, robots, jsonLdPayload, jsonLd]);

  return null;
};
