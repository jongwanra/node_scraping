const express = require('express');
const app = express();
const port = 3000;

const scrapingRouter = require('./routers/scraping');
app.use('/api', [scrapingRouter]);

// ejs setting
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`);
});
