import log4js from 'log4js'

const requestSync = require("request");
export const dbs = []
const map_all = {}

export let synchronous_method = function (url) {
  let options = {
      url: url,
      method: 'GET',
      headers: {
            'Content-Type':"application/json",
            json:true,
            Cookie: global.cookies
        }
  };
  console.log("synchronous_method options**********",options)
  return new Promise(function (resolve, reject) {
      requestSync(options, function (error, response, body) {
          if (error) {
              reject(error);
          } else {
              resolve(body);
          }
      });
  });
}

export let syncBody = async function (url) {
  var url = url;
  let body = await synchronous_method(url);
  return JSON.parse(body);
}
