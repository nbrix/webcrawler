var URL = require('url-parse');
const cheerio = require('cheerio');

class PageInfo {
	constructor(body, url) {
		this.$ = cheerio.load(body);
		this.url = new URL(url);
		this.baseUrl = this.url.protocol + "//" + this.url.hostname;
	}

	isKeywordOnPage(key) {
		if (key) {
			let text = this.$("body").text();
			let regex = new RegExp('\\b' + key + '\\b', 'gi');
			return regex.test(text);
		}
		return false;
	}
	
	getIcon() {
		return this.baseUrl + '/favicon.ico';
	}
	
	_convertRelativeToAbsolute(relativeLink) {
		return this.baseUrl + relativeLink;
	}
	
	getInternalLinks() {
		let allInternalLinks = new Set();
		let relativeLinks = this.$("a[href^='/']");
		
		relativeLinks.each(function() {
			let relativeLink = this.$(this).attr('href');
			let internalLink = this._convertRelativeToAbsolute(relativeLink);
			allInternalLinks.add(internalLink);
		});
		
		return Array.from(allInternalLinks);
	}
	
	getAbsoluteLinks() {
		let allAbsoluteLinks = new Set();
		let absoluteLinks = this.$("a[href^='http']");
		
		absoluteLinks.each(function() {
			let absoluteLink = this.$(this).attr('href');
			allAbsoluteLinks.add(absoluteLink);
		});
		
		return Array.from(allAbsoluteLinks);
	}
    
    getAllLinks() {
		let absoluteLinks = this.getAbsoluteLinks();
		let internalLinks = this.getInternalLinks();
		
		return absoluteLinks.concat(internalLinks);
    }
    
    getTitle() {
		let title = this.$("title").text();
		title = title.replace(/[\t\n\r]/g, ''); // strip tabs & new line chars
		return title;
    }

    getPageInfo() {
		let links = this.getAllLinks();
		let title = this.getTitle();
		let icon = this.getIcon();

		let pageInfo = {
			url: this.url,
			title: title,
			links: links,
			icon: icon
		};

		return pageInfo;
    }
}
