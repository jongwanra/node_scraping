const express = require('express');
const router = express.Router();
// https://auto.naver.com/car/main.nhn?yearsId=145951
// https://auto.naver.com/car/main.nhn?yearsId=145259
const cheerio = require('cheerio');
const axios = require('axios');
const iconv = require('iconv-lite');
const url =
  'https://auto.naver.com/car/mainList.nhn?mnfcoNo=0&modelType=OS&order=1&importYn=N&lnchYY=-1&saleType=-1&page=1';
// const url =
//   'https://auto.naver.com/car/mainList.nhn?mnfcoNo=0&modelType=OS&order=0&importYn=Y';
// const url = 'http://www.yes24.com/24/Category/BestSeller';

list = [];
router.get('/scraping', async (req, res) => {
  try {
    //크롤링 대상 웹사이트 HTML 가져오기
    await axios({
      url: url,
      method: 'GET',
      responseType: 'arraybuffer',
    }).then(async (html) => {
      //크롤링 코드
      const content = iconv.decode(html.data, 'UTF-8').toString();
      const $ = cheerio.load(content);
      const list = $('.model_group_new > .model_lst > li');

      await list.each(async (i, tag) => {
        const carInfo = $(tag).find('.model_name > .box > strong').text();
        const carName = carInfo.split(' ')[1]; // 차량 이름
        const carYear = carInfo.split(' ')[0]; // 연식
        const carImg = $(tag).find('.thmb > a > img').attr('src'); // 차량 이미지
        const carMakerImg = $(tag).find('.emblem > img').attr('src'); // 차량 로고
        const carType = $(tag).find('.lst > .info > a > span').text();
        // 차량 연비
        const carFuelEfficiency = $(tag)
          .find('.lst > .mileage > .dt > .ell > .en')
          .text();
        const carFuelBasic = carFuelEfficiency; // 다시 확인 필요
        const carFuel = $(tag)
          .find('.lst > .mileage > span:nth-child(4) > .ell')
          .text()
          .replace('출시', '')
          .trim();
        let carPriceFull = $(tag).find('.lst > .price').text();
        carPriceFull = trimCarFullPrice(carPriceFull);
        let carPrice = $(tag).find('.lst > .price').text();
        carPrice = trimCarPrice(carPrice);
        console.log('1');
        carDetailImg = await getDetailImg(
          $(tag).find('a.model_name').attr('href')
        );
        console.log('4');
        console.log(carName, carDetailImg);
      });
    });

    res.send({ result: 'success', message: '크롤링이 완료 되었습니다.' });
  } catch (error) {
    //실패 할 경우 코드
    res.send({
      result: 'fail',
      message: '크롤링에 문제가 발생했습니다',
      error: error,
    });
  }
});

function trimCarFullPrice(text) {
  if (text.startsWith('가격정보없음')) {
    return text;
  }
  return text.replace('출시', '').trim();
}

function trimCarPrice(text) {
  if (text.startsWith('가격정보없음')) {
    return '0';
  }
  text = text.replace('출시', '').replace('만원', '').trim().split('~');
  // 원화인경우
  if (isWon(text)) {
    return text[0];
  } else {
    // 외국 화폐인 경우
    return calculateRate(text[0]);
  }
}
// 환율 계산
function calculateRate(text) {
  moneys = ['파운드', '달러', '루피', '유로'];
  updatedMoney = '';
  return text;
}

function isWon(text) {
  if (text.includes('만원')) {
    return true;
  }
  return false;
}

async function getDetailImg(text) {
  console.log('2');
  const yearId = text.split('=')[1];
  const detailPageUrl = `https://auto.naver.com/car/main.nhn?yearsId=${yearId}`;

  // #carMainImgArea > div > img
  // #carMainImgArea > div > img
  try {
    //크롤링 대상 웹사이트 HTML 가져오기
    await axios({
      url: detailPageUrl,
      method: 'GET',
      responseType: 'arraybuffer',
    }).then(async (html) => {
      //크롤링 코드
      const content = iconv.decode(html.data, 'UTF-8').toString();
      const $ = cheerio.load(content);
      const tag = $('#carMainImgArea > .main_img');
      const detailImg = $(tag).find('img').attr('src');
      console.log(detailImg);
      console.log('3');
      return detailImg;
    });
  } catch (error) {
    console.log(`error Msg: ${error}`);
    return 'error';
  }
}
module.exports = router;
