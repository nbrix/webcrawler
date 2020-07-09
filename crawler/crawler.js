/**
 * Crawler module.
 * @module crawler/crawler
 */

var Settings = require('./settings');
var Spiders = require('./spiders');
var SSE = require('./sse');
var Log = require('./log');

class Crawler {

  constructor(res) {
    this.sseConnection = new SSE(res);
    this.logger = new Log(Settings.logger);
    this.logger.createFileStream();
    this.spider = new Spiders(this.logger, this.sseConnection);
  }

  start() {
    var sseConnection = this.sseConnection;
    var self = this;
    let url = Settings.crawler.url;
    let limit = Settings.crawler.depth;
    let keyword = Settings.crawler.keyword;

    if (Settings['crawler'].spider == "Breadth") {
      this.spider.breadthFirst().then(() => {
        closeConnection();
      });
    } else if (Settings['crawler'].spider == "Depth") {
      this.spider.depthFirst().then(() => {
        closeConnection();
      });
    } else {
      closeConnection();
    }

    function closeConnection() {
      console.log('Crawl Complete.');
      setTimeout(function() {
        sseConnection.end();
      }, 1000);
    }
  }
}

module.exports = Crawler;
