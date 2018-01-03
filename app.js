const {promisify} = require('util');
const parser = require('rss-parser');   // to parse XML
const parseURL = promisify(parser.parseURL)
const axios = require('axios')          // to get page by link
const cheerio = require('cheerio');     // to parse HTML

const app = require('express')();
const PORT = process.env.PORT || 8000;

// handle errors
process.on('unhandledRejection', error => {
  console.error('unhandledRejection...', error)
})

function handleError(fn) {
  return function(...params) {
      return fn(...params).catch(function(err) {
          console.error('Oops...', err)
      })
  }
}

// parse RSS(XML) and extract links
const parseRSS = async (newsCount) => {
  const parsed = await parseURL('https://www.057.ua/rss');  
  const linksCount = [];
  for (let i=0; i<newsCount; i++) {
    const articleLink = parsed.feed.entries[i].link;
    linksCount.push(articleLink);   // add link to array
  }
  return linksCount;
}

// get page using extracted link
const getArticleBody = async (link) => {
  const response = await axios.get(link);
  return response.data;
}

// parse loaded page
const parseArticle = (body, links, index) => {
  const article = {};
  const $ = cheerio.load(body);
  article.link = links[index];
  article.title = ($('.title-container.inner-title > h1').text());
  article.imageMain = ($('.article-photo.article-photo--main > img').attr('src')) || '';
  article.content = ($('.article-text > p').text());
  return article;
}

// middleware
const parsedLinks = async (req, res) => {
  const newsCount = req.params.count;
  const links = await parseRSS(newsCount);
  const bodies = await Promise.all(links.map(async(link) => {
    const body = await getArticleBody(link);
    return body;
  }));
  
  const articles = bodies.map((body, index) => parseArticle(body, links, index));
  res.send(articles);
} 




app.get('/', (req, res) => {
  res.send('Hello!');
});

app.get('/news/:count', handleError(parsedLinks));

app.listen(PORT, () => { 
  console.log(`listening on port ${PORT}`); 
});
