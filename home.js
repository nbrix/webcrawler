var express = require('express');

var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:'main'});
var bodyParser = require('body-parser');
var session = require('express-session');
var request = require('request');
var cookieParser = require('cookie-parser');
var crypto = require("crypto");
var se = require('./crawler2.js');
var rp = require('request-promise');
var cheerio = require('cheerio');

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({secret:'SecretPassword'}));
app.use(express.static('assets'));

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.env.PORT || 80);

function randomString(){
  return "htt://" + crypto.randomBytes(10).toString('hex') + ".com";
}

app.get('/',function(req,res,next){
  var context = {};
  context.title = "Crawl the Web from a Starting URL";
  res.render('home', context);
});


app.get('/crawler',function(req,res,next){
  var context = {};
  context.title = "Crawl the Web from a Starting URL"
  var pastURLs = [];
  if (req.cookies && req.cookies["pastURLs"]) {
    pastURLs = req.cookies["pastURLs"];
  }
  context.pastURLs = pastURLs;
  res.render('crawler',context);
});

// app.get('/history',function(req,res,next){
//   var context = {};
//   context.title = "Previous URL searches"
//   var pastURLs = [];
//   if (req.cookies) pastURLs = req.cookies["pastURLs"];
//   console.log(req.cookies);
//   console.log(pastURLs);
//
//   context.pastURLs = pastURLs;
//   res.render('history',context);
// });

app.post('/submit',function(req,res,next){
  var context = {};
  var eventURL = "/stream?url=" + req.body.url + "&keyword=" + req.body.keyword + "&searchType=" + req.body.searchType + "&limit=" + req.body.maxDepth;
  var given_url = req.body.url;
  var pastURLs = [];
  if (req.cookies["pastURLs"]) pastURLs = [...req.cookies["pastURLs"]];
  pastURLs.push({"url":given_url});
  res.cookie("pastURLs", pastURLs);
  context.eventurl = eventURL;
  context.title = req.body.searchType + "-First Webcrawl for "+ req.body.url + " limit " + req.body.maxDepth;
  if (req.body.keyword && req.body.keyword.trim() != "") {
    context.keyword = "Keyword: " + req.body.keyword;
  }
  res.render('graph',context);
});

app.get('/about',function(req,res,next){
  var context = {};
  context.title = "About"
  res.render('about',context);
});

function breadthSearch(res, currentURL, URLS, allURLS, keyword, group, limit, messageCount){
  var found = false;
  var options = {
    uri: currentURL,
    transform: function (body) {
        return cheerio.load(body);
    }
  };
  rp(options) // call to request promise
  .then(function ($) {
        messageCount++;
        var visitedPage = se.formatLinks(currentURL, group, keyword, $);
        // Send the data to the browser
        var tosend = {};
        tosend[currentURL] = visitedPage;
        res.write('id: ' + messageCount + '\n');
        res.write("data: " + JSON.stringify(tosend) + '\n\n'); // Note the extra newline

        // Stop the loop if the keyword was found
        if(visitedPage['keyword']) found = true;
        // If the group we are on is less than the limit, add its links to those to be searched
        if (group < limit){
          for(let i=0; i< visitedPage['links'].length; i++){
            if(!allURLS.has(visitedPage['links'][i])){
              URLS[group + 1].push(visitedPage['links'][i]);
              allURLS.add(visitedPage['links'][i]);
            }
          }
        }
        for(let i=0; i<URLS.length; i++){
          console.log(URLS[i].length);
        }
        // Check for more links in the current group to visit
        while (URLS[group].length == 0 && group <= limit){
          group++;
        }
        // We have reached the limit or we found the keyword so we can close the SSE connection
        if(group > limit || found == true){
          console.log("ending");
          res.write('event: close\n');
          res.write('id: ' + messageCount + '\n');
          res.write("data: no more links" + '\n\n'); // Note the extra newline
          res.end();
        }
        else{
          var idx = Math.floor(Math.random() * URLS[group].length)
          currentURL = URLS[group].splice(idx,1)[0];
          console.log(currentURL);
          breadthSearch(res, currentURL, URLS, allURLS, keyword, group, limit, messageCount);
        }
  })
  .catch(function (err) {
      // Crawling or Cheerio failed
      // console.log(err);
      while (group <= limit && URLS[group].length == 0){
        group++;
      }
      // We have reached the limit or we found the keyword so we can close the SSE connection
      if(group > limit){
        console.log("ending");
        res.write('event: close\n');
        res.write('id: ' + messageCount + '\n');
        res.write("data: no more links" + '\n\n'); // Note the extra newline
        res.end();
      }
      else{
        var idx = Math.floor(Math.random() * URLS[group].length)
        currentURL = URLS[group].splice(idx,1)[0];
        console.log(currentURL);
        breadthSearch(res, currentURL, URLS, allURLS, keyword, group, limit, messageCount);
      }
  });
}

app.get('/stream',function(req,res,next){
  var context = {};
  context.title = "About";
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  var messageCount = 0;
  res.write('\n');

  var group = 0;
  var URLS = [];
  var found = false;
  var allURLS = new Set();
  var limit = Math.min(req.query.limit, 5);
  for (let i=0; i<=limit; i++){
    URLS.push([]);
  }
  var currentURL = req.query.url;
  if (req.query.searchType == 'Breadth'){
    breadthSearch(res, currentURL, URLS, allURLS, req.query.keyword, group, limit, messageCount);
  }
  else if (req.query.searchType == 'Depth') {
    while (limit >0){
      limit--;
      rp(options)
        .then(function ($) {
              messageCount++;
              res.write('id: ' + messageCount + '\n');
              res.write("data: " + JSON.stringify(se.formatLinks(req.query.url, group, "check", req.query.keyword, $)) + '\n\n'); // Note the extra newline
              group++;
        })
        .catch(function (err) {
            // Crawling or Cheerio failed
            console.log(err);
        });
      }
  }

  // setInterval(function (){
  //   messageCount++;
  //   res.write('id: ' + messageCount + '\n');
  //   res.write("data: " + req.query.url + " " + req.query.keyword + " " + req.query.searchType + " " + req.query.limit + '\n\n'); // Note the extra newline
  // }, 1000);
  // setTimeout(function (){
  //   messageCount++;
  //   res.write('event: close\n');
  //   res.write('id: ' + messageCount + '\n');
  //   res.write("data: " + randomString() + '\n\n'); // Note the extra newline
  // }, 5000);
  // res.render('about',context);
});

app.get('/graph',function(req,res,next){
  var context = {};
  context.graph = "graph";
  res.render('graph', context);
});

app.get('/:graph',function(req,res,next){
  var context = {};
  var graph = req.params.graph;
  if (req.cookies && req.cookies.pastURLs && req.cookies.pastURLs[graph]){
    var pastURL = req.cookies.pastURLs[graph];
    context.searchType = pastURL.searchType;
    context.url = pastURL.url;
    // context.links = pastURL.links;
    res.render('graph', context);
  }else{
    res.render('crawler', context);
  }
});

app.use(function(req,res){
  res.status(404);
  res.render('404');
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.type('plain/text');
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
