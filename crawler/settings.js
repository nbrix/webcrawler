var settings = {
  "limits": {
    MAX_LINKS: 300,
    DEPTH_LIMIT: 50,
    BREADTH_LIMIT: 2
  },
  "crawler": {
    spider: "",
    url: "",
    keyword: "",
    depth: ""
  },
  "logger": {
    filename: new Date().toISOString().replace(/[.:]/g, '-') + '.log',
    header: 'timestamp||title||url||keywordFound||group',
    path: './logs/'
  }
}

module.exports = settings;
