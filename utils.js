import { readFileSync } from "fs";
export let HTTPStatusCode;
(function (HTTPStatusCode) {
  HTTPStatusCode[HTTPStatusCode["INVALID"] = 400] = "INVALID";
  HTTPStatusCode[HTTPStatusCode["NOT_FOUND"] = 404] = "NOT_FOUND";
  HTTPStatusCode[HTTPStatusCode["OK"] = 200] = "OK";
})(HTTPStatusCode || (HTTPStatusCode = {}));
export function respondJson(res, httpCode, msg) {
  res.writeHead(httpCode, {
    "Content-type": "application/json"
  });
  res.end(JSON.stringify(msg));
}
export function readFileJsonAsync(fname) {
  return new Promise(async (_resolve, _reject) => {
    let result;
    try {
      result = JSON.parse(readFileSync(fname, "utf-8"));
    } catch (ex) {
      _reject(ex);
      return;
    }
    _resolve(result);
    return;
  });
}