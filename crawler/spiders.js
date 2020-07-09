/**
 * Spiders module.
 * @module crawler/crawler
 */

const request = require('request');
const cheerio = require('cheerio');
const Settings = require('./settings');
const PageInfo = require('./page_info');
var CrawlerState = require('./states');
var Promise = require('bluebird');

Promise.config({
  cancellation: true
});

/** @const user agents in case websites block servers from scraping data */
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36", // Chrome
  "Mozilla/5.0 (X11; Linux i686; rv:64.0) Gecko/20100101 Firefox/64.0", // Firefox
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A", // Safari
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14931" // Edge
]

/**
 * Crawls webpages and returns links found on each page.
 */
class Spiders {
  /**
   * @param {object} logger - file stream of log file to be written to.
   * @param {object} sse - server side connection to client.
   */
  constructor(logger, sse) {
    this.logger = logger;
    this.sse = sse;

    this.crawlerState = new CrawlerState();
    this.limit = Settings['crawler'].depth;
    this.keyword = Settings['crawler'].keyword;
    this.pagesVisited = [];
    this.id = 0;
    this.pastURLs = new Set();
  }

  depthFirst() {
    let url = Settings['crawler'].url;
    let limit = Settings['crawler'].depth;
    let previousURL = null;
    let self = this;

    return new Promise(async function(resolve, reject) {

      while (self.pagesVisited.length < limit) {
        try {
          var links = await self._visitPage(url, previousURL);
        } catch (error) {
          console.error(error);
        }

        let previousUrlLinks = [];
        if (self._isLinksAvailableToTraverse(links)) {
          previousUrlLinks = links;
          previousURL = url;
          url = self._getNextUrl(previousURL, previousUrlLinks);
        } else {
          if (self._isLinksAvailableToTraverse(previousUrlLinks)) {
            self._removeLastPageVisited();
            url = self._getNextUrl(self._getPreviousUrlOfVisitedPage(), previousUrlLinks);
          } else {
            reject('No more links to follow', self.pagesVisited);
            break;
          }
        }

        if (self._isKeywordFound()) {
          break;
        }
      }
      resolve(self.pagesVisited);
    })
  }

  _logToFile(data) {
    var log = new Date().toISOString() + '||' + data.title + '||' + data.url +
      '||' + data.keyword + '||' + data.group;
    this.logger.write(log);
  }

  // Get group number of url, where group number is the depth of the crawler
  // e.g. starting url = 0, links on starting url = 1, links of those links = 2
  _getGroupNumber(page) {
    let previousUrl = page.getReferringUrl();
    let group = 0;

    if (previousUrl != null) {
      let pos = this.pagesVisited.map(function(x) {
        return x.url;
      }).indexOf(previousUrl);
      group = this.pagesVisited[pos].group + 1;
    }
    return group;
  }

  _buildPageData(page) {
    return {
      url: page.getUrl(),
      prevURL: page.getReferringUrl(),
      title: page.getTitle(),
      keyword: page.isKeywordOnPage(this.keyword),
      icon: page.getIcon(),
      group: this._getGroupNumber(page)
    };
  }

  _visitPage(url, previousURL) {
    var self = this;

    // Set user-agent to prevent websites from blocking the crawler
    var userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    var customRequest = request.defaults({
      headers: {
        'User-Agent': userAgent
      }
    });

    return new Promise(function(resolve, reject, onCancel) {
      var request = customRequest.get(url, function(err, res, body) {
        if (err) {
          reject(err);
        } else {
          var page = new PageInfo(body, url);
          page.setReferringUrl(previousURL);

          let links = page.getAllLinks();
          let pageInfo = self._buildPageData(page);

          self.pastURLs.add(url);
          self.pagesVisited.push(pageInfo);

          setTimeout(function() {
            // prevent race condition
            if (!self.crawlerState.isStopped()) {
              self.crawlerState.updateCrawlerState(pageInfo);
              self._logToFile(pageInfo);
              self.sse.write(this.id++, JSON.stringify(pageInfo));
            }
          }, 100);

          resolve(links);
        }
      });
      onCancel(function() {
        console.log("aborted request: " + url);
        request.abort();
      });
    })
  }

  _getNextUrl(previousUrl, links) {
    let randomIndex = Math.floor(Math.random() * links.length);
    let link = links[randomIndex];

    while (link == previousUrl) {
      [links[randomIndex], links[links.length - 1]] = [links[links.length - 1], links[randomIndex]];
      links.pop();

      if (links && links.length) {
        randomIndex = Math.floor(Math.random() * links.length);
        link = links[randomIndex];
      } else {
        return null;
      }
    }
    return link;
  }

  _removeLastPageVisited() {
    this.pagesVisited.pop();
  }

  _getPreviousUrlOfVisitedPage() {
    return this.pagesVisited[this.pagesVisited.length - 1].prevURL;
  }

  _isLinksAvailableToTraverse(links) {
    return links && links.length;
  }

  _isKeywordFound() {
    return this.pagesVisited[this.pagesVisited.length - 1].keyword;
  }

  breadthFirst() {
    var queue = [];
    var previousURL = null;
    let url = Settings['crawler'].url;
    let limit = Settings['crawler'].depth;
    var self = this;

    return new Promise(async function(resolve, reject) {

      try {
        var links = await self._visitPage(url, previousURL);
      } catch (error) {
        console.error(error);
      }
      self._addLinksToQueue(links, url, queue);

      for (let i = 0; i < limit; ++i) {
        try {
          await self._visitLinksFromQueue(queue);
        } catch (error) {
          console.error(error);
        }
        console.log("try");
      }
      resolve(self.pagesVisited);
    });
  }

  _addLinksToQueue(links, url, queue) {
    links.forEach(function(link) {
      queue.push({
        link: link,
        prevURL: url
      });
    });
  }

  _visitLinksFromQueue(queue) {
    var self = this;
    var tempQueue = queue.slice(0);
    queue.length = 0; // empty queue

    // Prevent the crawler from getting too many links
    var capacity = Settings['limits'].MAX_LINKS - this.pagesVisited.length;
    var size = (tempQueue.length > capacity) ? capacity : tempQueue.length;

    var promises = [];
    for (let i = 0; i < size; ++i) {
      if (!self._visited(tempQueue[i].link)) {
        var result = self._visitPage(tempQueue[i].link, tempQueue[i].prevURL)
          .then(links => {
            if (self.crawlerState.isStopped()) {
              throw {
                message: self.crawlerState.getStateInfo()
              };
            }
            self._addLinksToQueue(links, tempQueue[i].link, queue);
          })
          .catch(signal => {
            throw {
              message: signal.message
            }
          });
        promises.push(result);
      }
    }

    return Promise.all(promises).then(() => {
      console.log('Breadth-First layer complete');
    }).catch(signal => {
      console.log(signal.message);
      promises.forEach(p => p.cancel());
    });
  }

  _visited(url) {
    return this.pastURLs.has(url);
  }

}

module.exports = Spiders;
