import express from "express";
import ws from "ws";
import type http from "http";
import type net from "net";
import url from "url";
import type rpc from "vscode-ws-jsonrpc";
import { launchServer } from "./launchServer";
//import log4js from 'log4js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
//const logger = log4js.getLogger()
const envConfig = require("../../../../env.json")
Object.assign(process.env,envConfig)

process.setMaxListeners(0)
process.on("uncaughtException", function (err: any) {
  //logger.error("Uncaught Exception: ", err.toString());
  if (err.stack) {
    //logger.error(err.stack);
  }
});

let server: http.Server;
let cookieArry = {}

function getWebsocketKey(headers: string):string{
  if(headers === "" || headers == void 0){
    return ""
  }
  //logger.info("type of headers:",typeof(headers))
  //let headerToStr = JSON.stringify(headers).replace(/\"/g, "")
  let strWebsocketKey
  //logger.info("getWebsocketKey headers:",headers)
  var regExp_headers = '(?<="sec-websocket-key":")[^"]+'
  var websocketKey = headers.match(regExp_headers)[0]||"";
  //logger.info("websocketKey:",websocketKey)
  return websocketKey
}

function startServer() {
  const app = express();
  app.use(express.static(`${process.cwd()}/dist`));
  server = app.listen(process.env.server_port);
  //logger.info("startServer");

  const wss = new ws.Server({
    noServer: true,
    perMessageDeflate: false,
  });

  server.on(
    "upgrade",
    (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
      const path = request.url ? url.parse(request.url).pathname : undefined;
      if (path === "/server") {
        wss.handleUpgrade(request, socket, head, (webSocket) => {
          let webSockets = webSocket
          let dss_cookie='';
          if(request.headers.cookie != undefined){
            dss_cookie = request.headers.cookie
            cookieArry[dss_cookie] = webSocket
            webSockets = cookieArry[dss_cookie]
          }
          //logger.info("dss_cookie:",dss_cookie)
          const socket: rpc.IWebSocket = {
            send: (content) =>
              webSockets.send(content, (error) => {
                //console.log("content:",content)
                if (error) {
                  throw error;
                }
              }),
            onMessage: (cb) => webSockets.on("message", cb),
            onError: (cb) => webSockets.on("error", cb),
            onClose:function(cb){
              // console.log("onClose:",dss_cookie)
               webSockets.on("close", cb)
              // delete cookieArry[dss_cookie]
            },
            //onClose: (cb) => webSockets.on("close", cb),
            dispose: () => webSockets.close(),
          };
          //logger.info("cookieArry[dss_cookie]:",Object.keys(cookieArry))
          if (webSockets.readyState === webSockets.OPEN) {
            //logger.info("webSockets.OPEN dss_cookie:",dss_cookie)
            //logger.info("ready to launch server");
            launchServer(socket,dss_cookie);
          } else {
            webSockets.on("open", () => {
              //logger.info("ready to launch server");
              launchServer(socket,dss_cookie);
            });
          }
        });
      }
    }
  );
}

const timeoutFunc =(func) =>{
  //logger.info("定时任务执行中。。。")
  const nowTime = new Date().getTime()
  const timePoints = process.env.timing_time.split(':').map(i => parseInt(i))
  let recent = new Date().setHours(...timePoints)
  recent >= nowTime || (recent += 24 * 3600000)
  //logger.info("recent - nowTime:",recent - nowTime)
  setTimeout(() => {
    func()
    setInterval(func, process.env.timing_interval * 3600000 * 24)
    //logger.info("===========定时任务执行成功==================")
    //logger.info("cookieArry:",cookieArry)
    //logger.info("=============================================")
  }, recent - nowTime)
}

timeoutFunc(()=>{ cookieArry = {} })

startServer();

