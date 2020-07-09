var URL = require('url-parse');
const $ = require('cheerio');

class PageInfo {
  constructor(html, url) {
    this.html = html;
    this.referringUrl;
    this.url = new URL(url);
  }

  getUrl() {
    return this.url.toString();
  }

  setReferringUrl(referringUrl) {
    this.referringUrl = referringUrl;
  }

  getReferringUrl() {
    return this.referringUrl;
  }

  getBaseUrl() {
    return this.url.protocol + "//" + this.url.hostname;
  }

  isKeywordOnPage(key) {
    if (key) {
      let text = $("*", this.html).text();
      let regex = new RegExp('\\b' + key + '\\b', 'gi');
      return regex.test(text);
    }
    return false;
  }

  getIcon() {
    return this.getBaseUrl() + '/favicon.ico';
  }

  _convertRelativeToAbsolute(relativeLink) {
    return this.getBaseUrl() + relativeLink;
  }

  getInternalLinks() {
    let self = this;
    let allInternalLinks = new Set();
    let relativeLinks = $("a[href^='/']", this.html);

    relativeLinks.each(function() {
      let relativeLink = $(this).attr('href');
      let internalLink = self._convertRelativeToAbsolute(relativeLink);
      allInternalLinks.add(internalLink);
    });

    return Array.from(allInternalLinks);
  }

  getAbsoluteLinks() {
    let self = this;
    let allAbsoluteLinks = new Set();
    let absoluteLinks = $("a[href^='http']", this.html);

    absoluteLinks.each(function() {
      let absoluteLink = $(this).attr('href');
      allAbsoluteLinks.add(absoluteLink);
    });

    return Array.from(allAbsoluteLinks);
  }

  getAllLinks() {
    let absoluteLinks = this.getAbsoluteLinks();
    let internalLinks = this.getInternalLinks();

    // Remove duplicates
    return absoluteLinks.concat(internalLinks.filter((item) => absoluteLinks.indexOf(item) < 0));
  }

  getTitle() {
    let title = $("title", this.html).text();
    title = title.replace(/[\t\n\r]/g, ''); // strip tabs & new line chars
    return title;
  }
}

module.exports = PageInfo;
