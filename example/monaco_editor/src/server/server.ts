import express from "express";
import ws from "ws";
import type http from "http";
import type net from "net";
import url from "url";
import type rpc from "vscode-ws-jsonrpc";
import { launchServer } from "./launchServer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const envConfig = require("../../../../env.json")
Object.assign(process.env,envConfig)
console.log(envConfig)

process.setMaxListeners(0)
process.on("uncaughtException", function (err: any) {
  console.error("Uncaught Exception: ", err.toString());
  if (err.stack) {
    console.error(err.stack);
  }
});

let server: http.Server;
let cookieArry = {}

function getWebsocketKey(headers: string):string{
  if(headers === "" || headers == void 0){
    return ""
  }
  console.log("type of headers:",typeof(headers))
  //let headerToStr = JSON.stringify(headers).replace(/\"/g, "")
  let strWebsocketKey
  console.log("getWebsocketKey headers:",headers)
  var regExp_headers = '(?<="sec-websocket-key":")[^"]+'
  var websocketKey = headers.match(regExp_headers)[0]||"";
  console.log("websocketKey:",websocketKey)
  return websocketKey
}

function startServer() {
  const app = express();
  app.use(express.static(`${process.cwd()}/dist`));
  server = app.listen(process.env.server_port);
  console.log("startServer");

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
          console.log("dss_cookie:",dss_cookie)
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
          console.log("cookieArry[dss_cookie]:",Object.keys(cookieArry))
          if (webSockets.readyState === webSockets.OPEN) {
            console.log("webSockets.OPEN dss_cookie:",dss_cookie)
            console.log("ready to launch server");
            launchServer(socket,dss_cookie);
          } else {
            webSockets.on("open", () => {
              console.log("ready to launch server");
              launchServer(socket,dss_cookie);
            });
          }
        });
      }
    }
  );
}

startServer();

