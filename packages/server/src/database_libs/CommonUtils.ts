import log4js from 'log4js'

const requestSync = require("request");
export const dbs = []
const map_all = {}

export let synchronous_method = function (url,method) {
console.log("common utils sychronous_method method:",url,method)
  let options = {
      url: url,
      method: method,
      headers: {
            'Content-Type':"application/json",
            json:true,
            Cookie: global.cookies
        }
  };
  console.log("synchronous_method options**********",options)
  if(method === 'GET'){
    return new Promise(function (resolve, reject) {
      requestSync.get(options, function (error, response, body) {
          if (error) {
              reject(error);
          } else {
              resolve(body);
          }
      });
    });
  }else{
    return new Promise(function (resolve, reject) {
      requestSync.post(options, function (error, response, body) {
          if (error) {
              reject(error);
          } else {
              resolve(body);
          }
      });
    });
  }
}

export let syncBody = async function (url,method) {
  console.log("get into syncBody:",url,method)
  var url = url;
  let body = await synchronous_method(url,method);
  return JSON.parse(body);
}
