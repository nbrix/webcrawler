const Settings = require('./settings');

const exitSignals = {
  DEPTH_LIMIT_REACHED: {
    value: 1,
    message: "Max depth limit reached."
  },
  KEYWORD_FOUND: {
    value: 2,
    message: "Keyword found."
  },
  MAX_LINKS_REACHED: {
    value: 3,
    message: "Max number of links reached."
  },
};

const states = {
  INITIALIZED: {
    value: 1,
    message: "Crawler has initialized."
  },
  RUNNING: {
    value: 2,
    message: "Crawler is running."
  },
  STOPPED: {
    value: 3,
    message: "Crawler has stopped: "
  },
  ERROR: {
    value: 4,
    message: "Error: "
  }
}

class CrawlerState {
  constructor() {
    this.state = states.INITIALIZED;
    this.stateInfo = states.INITIALIZED.message;
    this.pagesVisitedCount = 0;
    this.depthLimit = Settings['crawler'].depth;
  }

  getState() {
    return this.state;
  }

  getStateInfo() {
    return this.stateInfo;
  }

  setLimit(limit) {
    this.depthLimit = limit;
  }

  incrementPagesVisitedCount() {
    this.pagesVisitedCount++;
  }

  updateErrorState(err) {
    this.state = states.ERROR;
    this.state.message += err;
  }

  isError() {
    return this.state == states.ERROR;
  }

  isStopped() {
    return this.state == states.STOPPED;
  }

  isRunning() {
    return this.state == states.RUNNING;
  }

  isDepthLimitReached(pageInfo) {
    return pageInfo.group > this.depthLimit;
  }

  isKeywordFound(pageInfo) {
    return pageInfo.keyword;
  }

  isMaxLinksReached() {
    return this.pagesVisitedCount >= Settings['limits'].MAX_LINKS;
  }

  updateCrawlerState(pageInfo) {
    let status = "";

    if (this.isError()) {
      this.state = states.ERROR;
    } else {
      if (this.isDepthLimitReached(pageInfo)) {
        status += exitSignals.DEPTH_LIMIT_REACHED.message + '\n';
      }
      if (this.isKeywordFound(pageInfo)) {
        status += exitSignals.KEYWORD_FOUND.message + '\n';
      }
      if (this.isMaxLinksReached()) {
        status += exitSignals.MAX_LINKS_REACHED.message + '\n';
      }
      if (status == "") {
        this.state = states.RUNNING;
      }
      else if (this.state != states.STOPPED) {
        this.state = states.STOPPED;
      }
    }
    this.stateInfo = this.state.message + status;
  }
}

module.exports = CrawlerState;
