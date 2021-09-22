const express = require("express");
const router = express.Router();
const cheerio = require("cheerio");
const axios = require("axios");
const iconv = require("iconv-lite");
const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "tnvj79135@",
  database: "mycar2",
});
const url =
  "https://auto.naver.com/car/mainList.nhn?mnfcoNo=0&modelType=OS&order=1&importYn=N&lnchYY=-1&saleType=-1&page=1";

router.get("/scraping", async (req, res) => {
  connection.connect();
  try {
    //크롤링 대상 웹사이트 HTML 가져오기
    await axios({
      url: url,
      method: "GET",
      responseType: "arraybuffer",
    }).then(async html => {
      //크롤링 코드
      const content = iconv.decode(html.data, "UTF-8").toString();
      const $ = cheerio.load(content);
      const list = $(".model_group_new > .model_lst > li");

      await list.each(async (i, tag) => {
        const carInfo = $(tag).find(".model_name > .box > strong").text();
        const carName = carInfo; // 차량 이름
        const carYear = carInfo.split(" ")[0]; // 연식
        const carImg = $(tag).find(".thmb > a > img").attr("src"); // 차량 이미지
        const carMakerImg = $(tag).find(".emblem > img").attr("src"); // 차량 로고
        const carType = $(tag).find(".lst > .info > a > span").text();
        // 차량 연비
        const carFuelEfficiency = $(tag)
          .find(".lst > .mileage > .dt > .ell > .en")
          .text();
        const carFuelBasic = trimCarFuelEffi(carFuelEfficiency); // 다시 확인 필요
        const carFuel = $(tag)
          .find(".lst > .mileage > span:nth-child(4) > .ell")
          .text()
          .replace("출시", "")
          .trim();
        let carPriceFull = $(tag).find(".lst > .price").text();
        carPriceFull = trimCarFullPrice(carPriceFull);
        let carPrice = $(tag).find(".lst > .price").text();
        carPrice = trimCarPrice(carPrice);
        const intPrice = carPrice.replace(",", "");

        carDetailImg = await getDetailImg(
          $(tag).find("a.model_name").attr("href")
        );

        doc = {
          car_id: carDetailImg.yearId,
          car_name: carName,
          car_age: carYear,
          car_img: carImg,
          car_maker_img: carMakerImg,
          car_type: carType,
          car_fuel: carFuel,
          car_fuel_efficiency: carFuelEfficiency,
          car_fuel_basic: carFuelBasic,
          car_price_full: carPriceFull,
          car_price: parseInt(intPrice),
          car_detail_img: carDetailImg.Image,
        };

        // console.log(doc);
        // DB에 차량 정보 추가하기
        insertCarInfo(doc);
      });
    });

    res
      .render("index", {
        result: "success",
        message: "크롤링이 완료 되었습니다.",
      })
      .then(() => connection.end());
  } catch (error) {
    //실패 할 경우 코드
    res.send({
      result: "fail",
      message: "크롤링에 문제가 발생했습니다",
      error: error,
    });
  }
});

//차량 연비 정규화
function trimCarFuelEffi(text) {
  if (!text.includes("~")) {
    if (text == "정보없음") {
      text = 0;
    } else {
      text = crulEffi(text);
    }
  } else {
    text = text.split("~");
    text = crulEffi(text[1]);
  }
  return text;
}

// 연비 통일화
function crulEffi(effi) {
  // km/ℓ, km/kWh, km/kg, ℓ/100km, mpg

  let st = effi.split("/");
  let value = 0;

  if (st[0].includes("km")) {
    value = Number(st[0].replace("km", ""));
  } else if (st[0].includes("mpg")) {
    value = Number(st[0].replace("mpg", ""));
  } else if (st[0].includes("ℓ")) {
    value = Number(st[0].replace("ℓ", ""));
  }
  //kWh 변환
  if (effi.includes("kWh")) {
    value = value * 3.68;
  }
  // mgp 변환
  else if (effi.includes("mpg")) {
    value = value / 2.5;
  }
  // 소수점 첫째자리 반올림 하고 반환
  return Math.round(value);
}
function trimCarFullPrice(text) {
  if (text.startsWith("가격정보없음")) {
    return text;
  }
  return text.replace("출시", "").trim();
}

function trimCarPrice(text) {
  // 가격 정보가 없는 경우 0원
  if (text.startsWith("가격정보없음")) {
    return "0";
  }
  priceText = text.replace("출시", "").replace("만원", "").trim().split("~");
  // 원화인경우
  if (isWon(text)) {
    return priceText[0];
  } else {
    // 외국 화폐인 경우
    return calcRate(priceText);
  }
}
// 환율 계산
function calcRate(priceArr) {
  const moneys = ["파운드", "달러", "루피", "유로"];
  let updatedMoney = 0;
  for (let price of priceArr) {
    for (let rate of moneys) {
      if (price.includes(rate)) {
        if (rate == "파운드") {
          updatedMoney = Math.round(
            (int(priceArr[0].replace(",", "").replace("파운드", "")) * 1623) /
              10000
          );
        } else if (rate == "달러") {
          updatedMoney = Math.round(
            (int(priceArr[0]).replace(",", "").replace("", "") * 1168) / 10000
          );
        } else if (rate == "루피") {
          updatedMoney = Math.round(
            (int(priceArr[0]).replace(",", "").replace("", "") * 16) / 10000
          );
        } else if (rate == "유로") {
          updatedMoney = Math.round(
            (int(priceArr[0]).replace(",", "").replace("", "") * 1382) / 10000
          );
        } else {
          console.log("can't find rate");
        }
      }
    }
  }
  return text;
}

function isWon(text) {
  if (text.includes("만원")) {
    return true;
  }
  return false;
}

// 상세페이지에서 상세 이미지 가져오기
function getDetailImg(text) {
  return new Promise(function (resolve, reject) {
    let yearId = text.split("=")[1];

    const detailPageUrl = `https://auto.naver.com/car/main.nhn?yearsId=${yearId}`;

    try {
      //크롤링 대상 웹사이트 HTML 가져오기
      axios({
        url: detailPageUrl,
        method: "GET",
        responseType: "arraybuffer",
      }).then(async html => {
        //크롤링 코드
        const content = iconv.decode(html.data, "UTF-8").toString();
        const $ = cheerio.load(content);
        const tag = $("#carMainImgArea > .main_img");
        const detailImg = {
          Image: $(tag).find("img").attr("src"),
          yearId,
        };
        resolve(detailImg);
      });
    } catch (error) {
      console.log(`error Msg: ${error}`);
      return "error";
    }
  });
}

// 차량 정보 DB에 추가하기
function insertCarInfo(doc) {
  new Promise(function (resolve, reject) {
    param = [
      doc.car_id,
      doc.car_name,
      doc.car_age,
      doc.car_img,
      doc.car_maker_img,
      doc.car_type,
      doc.car_fuel,
      doc.car_fuel_efficiency,
      doc.car_fuel_basic,
      doc.car_price_full,
      doc.car_price,
      0,
    ];

    if (param[0] != undefined) {
      resolve(param);
    } else {
      reject();
    }
  })
    // 성공 처리
    .then(param => {
      const sql =
        "INSERT INTO car_info(car_uuid,car_name, car_release_date, car_img, car_maker_img, car_type, car_fuel_type, car_fuel_efficiency, car_fuel_basic, car_price_range, car_price, car_like_cnt) VALUES(?, ?, ?,?, ?, ?,?, ?, ?,?, ?, ?)";
      connection.query(sql, param, function (error, result) {
        // query문에서 에러가 발생할 경우
        if (error) {
          console.log(`Query Error Msg: ${error}`);
          return;
        }
        console.log(`Msg: Sucess Insert Query`);
      });
    })
    // 실패 처리
    .catch(error => {
      console.log(`Msg_catch: ${error}`);
    });
}
module.exports = router;
