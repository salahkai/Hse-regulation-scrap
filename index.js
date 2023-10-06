import * as cheerio from 'cheerio';
import express from 'express';
import fetch from 'node-fetch';

const port = 5000;
const app = express();

// patterns used to detect type of paragraph
const legislativePattern = /Loi n°/;
const regulatoryPattern = /Décret exécutif n°/;

const mainUrl = 'https://www.me.gov.dz/fr/';

async function extractData(name) {
  // fetch the website
  const data = {
    legislative: [],
    regulatory_texts: [],
  };

  const response = await fetch(
    `${mainUrl}${name}`
  );
  const body = await response.text();
  const $ = cheerio.load(body);

  // container of all paragraphs
  const mainContainer = $(
    '.elementor-element-b7198e9'
  );

  // suppose that paragraphs are in p element
  mainContainer.find('p').each((i, e) => {
    // suppose that legislatives are in p element
    if (legislativePattern.test($(e).text())) {
      data.legislative.push({
        description: $(e).text(),
        link: $(e).find('a').attr('href'),
      });
    }

    // suppose that regulatory texts are in ul element
    if (regulatoryPattern.test($(e).text())) {
      // check if the text has ul element, hence add stops ( arretes )
      if ($(e).next().is('ul')) {
        const stops = [];
        $(e)
          .next()
          .children()
          .each((i, li) => {
            stops.push({
              description: $(li).text(),
              link: $(li).find('a').attr('href'),
            });
          });

        data.regulatory_texts.push({
          description: $(e).text(),
          link: $(e).find('a').attr('href'),
          stops: stops,
        });
      } else {
        data.regulatory_texts.push({
          description: $(e).text(),
          link: $(e).find('a').attr('href'),
        });
      }
    }
  });

  // suppose that paragraphs are in div / ol
  // suppose that legislative are in div
  mainContainer
    .find('div.elementor-widget-container')
    .each((i, e) => {
      if (legislativePattern.test($(e).text())) {
        data.legislative.push({
          description: $(e)
            .text()
            .match(/./g)
            .filter((c) => !/[\t|\n]/.test(c))
            .join(''),
          link: $(e).find('a').attr('href'),
        });
      }
    });

  mainContainer
    .find('div.elementor-widget-container')
    .find('ol')
    .find('li')
    .each((i, e) => {
      if (regulatoryPattern.test($(e).text())) {
        data.regulatory_texts.push({
          description: $(e)
            .text()
            .match(/./g)
            .filter((c) => !/[\t|\n]/.test(c))
            .join(''),
          link: $(e).find('a').attr('href'),
        });
      }
    });
  return data;
}

app.get('/', (req, res) => {
  res.send('Read docs for more infos');
});
app.get(
  '/:category',
  async (req, res) => {
    const data = await extractData(
      req.params.category
    );
    res.send(data);
  }
);

app.listen(port, () =>
  console.log(`Server Started on port : ${port}`)
);
