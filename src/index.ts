
import { readFileSync } from "fs";

/**for fucks sake..*/
// import { createProxy, ServerOptions as ProxyServerOptions } from "http-proxy";
import httpProxyPkg from "http-proxy";
const createProxy = httpProxyPkg.createProxy;
import type { ServerOptions as ProxyServerOptions } from "http-proxy";
import { parse as parseQueryUrl } from "querystring";

import serveHandler from "serve-handler";

import { createServer, ServerOptions } from "https";
import { HTTPStatusCode, respondJson } from "./utils.js";
import { dbState, db_create_user, db_init, db_start_resource_map, db_update_resource_version, OptsCreateUser } from "./db.js";

import watch from "node-watch";
import EventSourcePkg from "eventsource";
global.EventSource = EventSourcePkg;

interface ResNetworkTime {
  now: number;
}

interface ReqRegister {
  name: string;
  username: string;
  password: string;
}

/**Yarr multi-tool
 * 
 * Facilitates the following:
 * - Acts as HTTPS to HTTP proxy server for securely piping data/websockets to pocketbase server
 * - Adds extra features that pocketbase doesn't have ( /networktime for syncing client's animations )
 * - Acts as admin user bot for authorizing players earning stuff/getting kicked off
 * - Watches static files for changes and notifies pocketbase, which in turn notifies clients so they'll reload those assets
 * - Future expansion if necessary
 */
async function main () {

  console.log("Starting");

  /**SSL certificates*/
  const serverOptions: ServerOptions = {
    key: readFileSync("ssl.key.pem"),
    cert: readFileSync("ssl.cert.pem")
  };

  /**Proxy server options, basically just target the pocketbase server*/
  const proxyOptions: ProxyServerOptions = {
    target: {
      host: "127.0.0.1",
      port: "8090"
    },
    ssl: serverOptions
  };

  //the proxy itself
  const proxy = createProxy(proxyOptions);

  console.log("Creating SSL Web Server");

  const publicPort = 10209;

  //connect to database and init admin rights
  await db_init();

  //sort out what goes where
  const server = createServer(serverOptions, async (req, res)=>{

    //wtf, why do I have to do this
    let queryStr = req.url.substring(req.url.indexOf("?")+1);

    //get url params
    let query = parseQueryUrl(queryStr) as unknown;

    //when a client asks for the current network time
    if (req.url === "/networktime") {

      respondJson(res, HTTPStatusCode.OK, {
        now: Date.now()
      } as ResNetworkTime);
      
    } else if (req.url.startsWith("/register")) {
      let reqRegister = query as OptsCreateUser;
      
      let result: false|Record<any, any>;
      try {
        result = await db_create_user(reqRegister);
      } catch (ex) {
        // console.warn(ex);
        result = false;
      }

      if (!result) {
        respondJson(res, HTTPStatusCode.OK, {
          error: `Unable to create user`
        } as any);
        
      } else {
        respondJson(res, HTTPStatusCode.OK, result);
      }
    } else if (req.url.startsWith("/_") || req.url.startsWith("/api")) {
      //everything else goes directly to pocketbase server (includes pb_public static folder)
      proxy.web(req, res);

    } else {
      
      //handling static serve with server-handler because pocketbase serves incorrect mime type for JS modules

      serveHandler(req, res, {
        directoryListing: false,
        rewrites: [
          { "source": "", "destination": "/index.html" }
        ],
        public: "pb_public"
      });

    }
  }).listen(publicPort);

  console.log(`Yarr Web/Proxy Server started https://localhost:${publicPort}`);

  let resMap = new Map<string, string>();
  await db_start_resource_map(resMap);

  let modelsWatcher = watch("./pb_public/models", {delay: 200, recursive: false});
  modelsWatcher.on("change", (type, fname: string)=>{
    fname = fname.split("\\").join("/"); //handle windows paths

    fname = "./" + fname.substring("pb_public/".length);

    // console.log("[node-watch] detected change of", fname);
    
      let resId = resMap.get(fname);

      if (resId) {
        console.log("fs change: ", fname, "updating resource", resId);
        db_update_resource_version(resId);
      }
  });

}

main();
