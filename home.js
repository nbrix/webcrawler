var express = require('express');

var app = express();

// helper that converts input to JSON
var handlebars = require('express-handlebars').create({
  defaultLayout: 'main',
  helpers: {
    json: function(context) {
      return JSON.stringify(context);
    },
  }
});

var bodyParser = require('body-parser');
var session = require('express-session');
var request = require('request');
var cookieParser = require('cookie-parser');
var crypto = require("crypto");
var Crawler = require('./crawler/crawler');
var Settings = require('./crawler/settings');
const DEPTH_LIMIT = 50;
const BREADTH_LIMIT = 2;

app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use(session({
  secret: 'SecretPassword'
}));
app.use(express.static('assets'));
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.env.PORT || 80);

app.get('/', function(req, res, next) {
  var context = {};
  context.title = "Crawl the Web from a Starting URL";
  res.render('home', context);
});

app.get('/crawler', function(req, res, next) {
  var context = {};
  var pastURLs = [];

  // Store cookies of past crawls
  if (req.cookies && req.cookies["pastURLs"]) {
    pastURLs = req.cookies["pastURLs"];
  }
  var tmp = pastURLs.map((x) => {
    return {
      "query": "/previous?url=" + x.url + "&keyword=" + x.keyword + "&searchType=" + x.searchType + "&maxDepth=" + x.maxDepth,
      'url': x.url,
      'keyword': x.keyword,
      "searchtype": x.searchType,
      "limit": x.maxDepth
    };
  });

  context.pastURLs = tmp;
  context.depthLimit = Settings.limits.DEPTH_LIMIT;
  context.breadthLimit = Settings.limits.BREADTH_LIMIT;
  res.render('graph', context);
});

app.delete('/crawler', function(req, res) {
  res.clearCookie('pastURLs');
  return res.sendStatus(200);
});

app.get('/previous', function(req, res, next) {
  var context = {};
  var eventURL = "/stream?url=" + req.query.url + "&keyword=" + req.query.keyword + "&searchType=" + req.query.searchType + "&limit=" + req.query.maxDepth;
  var given_url = req.query.url;
  context.eventurl = eventURL;
  context.title = req.query.searchType + "-First Webcrawl for " + req.query.url + " limit " + req.query.maxDepth;
  if (req.query.keyword && req.query.keyword.trim() != "") {
    context.keyword = "Keyword: " + req.query.keyword;
  }
  res.render('graph', context);
});

app.post('/submit', function(req, res, next) {
  var context = {};
  var limit = req.body.limit;
  var eventURL = "/stream?url=" + req.body.url + "&keyword=" + req.body.keyword + "&searchType=" + req.body.searchType + "&limit=" + limit;
  var given_url = req.body.url;
  var pastURLs = [];
  if (req.cookies["pastURLs"])
    pastURLs = [...req.cookies["pastURLs"]];
  pastURLs.unshift({
    "url": given_url,
    "keyword": req.body.keyword,
    "searchType": req.body.searchType,
    "maxDepth": limit
  });
  res.cookie("pastURLs", pastURLs);
  context.eventurl = eventURL;
  context.title = req.body.searchType + "-First Webcrawl for " + req.body.url + " limit " + limit;
  if (req.body.keyword && req.body.keyword.trim() != "") {
    context.keyword = "Keyword: " + req.body.keyword;
  }
  res.send(context);
});

app.get('/about', function(req, res, next) {
  var context = {};
  context.title = "About";
  res.render('about', context);
});

app.get('/stream', function(req, res, next) {
  Settings['crawler'].depth = req.query.limit;
  Settings['crawler'].url = req.query.url;
  Settings['crawler'].keyword = req.query.keyword === '' ? null : req.query.keyword;
  Settings['crawler'].spider = req.query.searchType;

  var crawler = new Crawler(res);
  crawler.start();

});

app.get('/graph', function(req, res, next) {
  var context = {};
  context.graph = "graph";
  res.render('graph', context);
});

app.get('/:graph', function(req, res, next) {
  var context = {};
  var graph = req.params.graph;
  if (req.cookies && req.cookies.pastURLs && req.cookies.pastURLs[graph]) {
    var pastURL = req.cookies.pastURLs[graph];
    context.searchType = pastURL.searchType;
    context.url = pastURL.url;
    res.render('graph', context);
  } else {
    res.render('crawler', context);
  }
});

app.use(function(req, res) {
  res.status(404);
  res.render('404');
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.type('plain/text');
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function() {
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
