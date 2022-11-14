import express from "express";
import ws from "ws";
import type http from "http";
import type net from "net";
import url from "url";
import type rpc from "vscode-ws-jsonrpc";
import { launchServer } from "./launchServer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.setMaxListeners(0)
process.on("uncaughtException", function (err: any) {
  console.error("Uncaught Exception: ", err.toString());
  if (err.stack) {
    console.error(err.stack);
  }
});

let server: http.Server;
let cookieArry = {}

function startServer() {
  const app = express();
  app.use(express.static(`${process.cwd()}/dist`));
  server = app.listen(3000);
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
        wss.handleUpgrade(request, socket, head, (webSocket: any) => {
          let webSockets = webSocket;
          let dss_cookie='';
          if(request.headers.cookie != undefined){
            dss_cookie = request.headers.cookie
            cookieArry[dss_cookie] = webSocket
            webSockets = cookieArry[dss_cookie]
          }
          const socket: rpc.IWebSocket = {
            send: (content: any) =>
              webSockets.send(content, (error: any) => {
                //console.log("content:",content)
                if (error) {
                  throw error;
                }
              }),
            onMessage: (cb: any) => webSockets.on("message", cb),
            onError: (cb: any) => webSockets.on("error", cb),
            onClose: (cb: any) => webSockets.on("close", cb),
            dispose: () => webSockets.close(),
          };
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
