// Dynamic SEO meta tag updater
// Sets canonical URL and og:url based on current hostname
(function() {
  const currentUrl = window.location.origin + window.location.pathname;
  
  // Set canonical URL
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = currentUrl;
  
  // Set og:url
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);
  }
  ogUrl.content = currentUrl;
  
  // Set twitter:url
  let twitterUrl = document.querySelector('meta[name="twitter:url"]');
  if (!twitterUrl) {
    twitterUrl = document.createElement('meta');
    twitterUrl.setAttribute('name', 'twitter:url');
    document.head.appendChild(twitterUrl);
  }
  twitterUrl.content = currentUrl;
  
  // Update og:image and twitter:image with absolute URLs
  const imageUrl = window.location.origin + '/favicon.png';
  
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    ogImage.content = imageUrl;
  }
  
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage) {
    twitterImage.content = imageUrl;
  }
})();
