class PageInfo {
  constructor(body, url) {
    this.$ = cheerio.load(body);
    this.url = url;
  }
  
  isKeywordOnPage(key) {
    if (key) {
      var text = $("body").text();
      var regex = new RegExp('\\b' + key + '\\b', 'gi');
      return regex.test(text);
    }
    return false;
  }
	
	getIcon() {
		var path = url.split('/');
		return path[0] + '//' + path[2] + '/favicon.ico';
	}

    _isUrlAbsolutePath(url) {
        var regex = new RegExp('^(?:[a-z]+:)?//', 'i');
        return regex.test(url);
    }

    _formatLinks(links, currentPage, $) {
        var uniqueLinks = new Set();
        var self = this;

        $(links).each(function (i, link) {
            var url = $(link).attr('href');

            // Ignore links to elements
            if (url != null && url.charAt(0) == '#')
                return true;

            // Convert relative paths to absolute
            if (!self._isUrlAbsolutePath(url)) {
                if (currentPage[currentPage.length - 1] == '/') {
                    currentPage = currentPage.substr(0, currentPage.length - 1);
                }
                url = currentPage + url;
            }

            // Check if valid protocol
            var path = url.split('/');
            if (path[0] == 'http:' || path[0] == 'https:')
                uniqueLinks.add(url);
        });

        // Return an array from the set of unique links, so that they can be indexed
        return Array.from(uniqueLinks);
    }
    
    getLinks() {
      let links = $('a');
      links = self._formatLinks(links, url, $);
      return links;
    }
    
    getTitle() {
      let title = $("title").text();
      title = title.replace(/[\t\n\r]/g, ''); // strip tabs & new line chars
      return title;
    }

    getPageInfo() {
      let links = this.getLinks();
      let title = this.getTitle();
      let icon = this.getIcon();

      let pageInfo = {
        url: url,
        title: title,
        links: links,
        icon: icon
      };

      return pageInfo;
    }
}
