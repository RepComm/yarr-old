import { readFileSync } from "fs";

/**for fucks sake..*/
// import { createProxy, ServerOptions as ProxyServerOptions } from "http-proxy";
import httpProxyPkg from "http-proxy";
const createProxy = httpProxyPkg.createProxy;
import { parse as parseQueryUrl } from "querystring";
import serveHandler from "serve-handler";
import { createServer } from "https";
import { HTTPStatusCode, respondJson } from "./utils.js";
import { db_create_user, db_init } from "./db.js";
/**Yarr multi-tool
 * 
 * Facilitates the following:
 * - Acts as HTTPS to HTTP proxy server for securely piping data/websockets to pocketbase server
 * - Adds extra features that pocketbase doesn't have ( /networktime for syncing client's animations )
 * - Acts as admin user bot for authorizing players earning stuff/getting kicked off
 * - Watches static files for changes and notifies pocketbase, which in turn notifies clients so they'll reload those assets
 * - Future expansion if necessary
 */
async function main() {
  console.log("Starting");

  /**SSL certificates*/
  const serverOptions = {
    key: readFileSync("ssl.key.pem"),
    cert: readFileSync("ssl.cert.pem")
  };

  /**Proxy server options, basically just target the pocketbase server*/
  const proxyOptions = {
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
  const server = createServer(serverOptions, async (req, res) => {
    //wtf, why do I have to do this
    let queryStr = req.url.substring(req.url.indexOf("?") + 1);

    //get url params
    let query = parseQueryUrl(queryStr);

    //when a client asks for the current network time
    if (req.url === "/networktime") {
      respondJson(res, HTTPStatusCode.OK, {
        now: Date.now()
      });
    } else if (req.url.startsWith("/register")) {
      let reqRegister = query;
      let result;
      try {
        result = await db_create_user(reqRegister);
      } catch (ex) {
        // console.warn(ex);
        result = false;
      }
      if (!result) {
        respondJson(res, HTTPStatusCode.OK, {
          error: `Unable to create user`
        });
      } else {
        respondJson(res, HTTPStatusCode.OK, result);
      }
    } else if (req.url.startsWith("/_") || req.url.startsWith("/api")) {
      //everything else goes directly to pocketbase server (includes pb_public static folder)
      proxy.web(req, res);
    } else {
      serveHandler(req, res, {
        directoryListing: false,
        rewrites: [{
          "source": "",
          "destination": "/index.html"
        }],
        public: "pb_public"
      });
    }
  }).listen(publicPort);
  console.log(`Yarr Web/Proxy Server started https://localhost:${publicPort}`);
}
main();