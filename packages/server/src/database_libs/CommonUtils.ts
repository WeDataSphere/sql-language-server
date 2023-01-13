import log4js from 'log4js'

const logger = log4js.getLogger()
const requestSync = require("request");
export const dbs = []
const map_all = {}

export let synchronous_method = function (url,method,ticketId) {
  logger.info("common utils sychronous_method method:",url,method,ticketId)
  let options = {
      url: url,
      method: method,
      headers: {
            'Content-Type':"application/json",
            json:true,
            Cookie:ticketId
        }
  };
  //console.log("synchronous_method options**********",options)
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

export let syncBody = async function (url,method,ticketId) {
  logger.info("get into syncBody:",url,method,ticketId)
  var url = url;
  let body = await synchronous_method(url,method,ticketId);
  return JSON.parse(body);
}
