export function setMetaTags({ title, description, canonical, image, type = 'website' } = {}) {
  if (title) document.title = title;

  function ensureMeta(name, attr = 'name') {
    let el = document.head.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    return el;
  }

  if (description) {
    ensureMeta('description').setAttribute('content', description);
  }

  // Open Graph
  ensureMeta('og:title', 'property').setAttribute('content', title || '');
  if (description) ensureMeta('og:description', 'property').setAttribute('content', description);
  ensureMeta('og:type', 'property').setAttribute('content', type);
  if (image) ensureMeta('og:image', 'property').setAttribute('content', image);

  // Twitter Card
  ensureMeta('twitter:card').setAttribute('content', image ? 'summary_large_image' : 'summary');
  ensureMeta('twitter:title').setAttribute('content', title || '');
  if (description) ensureMeta('twitter:description').setAttribute('content', description);
  if (image) ensureMeta('twitter:image').setAttribute('content', image);

  // Canonical
  if (canonical) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
  }
}

export function applyArticleStructuredData({
  title,
  description,
  url,
  image,
  authorName,
  datePublished
} = {}) {
  // remove previous structured data script if present
  const existing = document.head.querySelector('script[type="application/ld+json"][data-generated-by="seo"]');
  if (existing) existing.remove();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title || '',
    description: description || '',
    url: url || window.location.href,
    image: image ? [image] : undefined,
    author: authorName ? { "@type": "Person", name: authorName } : undefined,
    datePublished: datePublished || undefined,
    publisher: {
      "@type": "Organization",
      name: "Asian Travel Blog"
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-generated-by', 'seo');
  script.textContent = JSON.stringify(articleLd);
  document.head.appendChild(script);
}

export default { setMetaTags, applyArticleStructuredData };
