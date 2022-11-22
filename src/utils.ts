
import { readFileSync } from "fs";
import { ServerResponse, IncomingMessage } from "http";

export enum HTTPStatusCode {
  INVALID = 400,
  NOT_FOUND = 404,
  OK = 200
}

export type ServResp = ServerResponse<IncomingMessage> & {
  req: IncomingMessage;
};

export function respondJson<Res> (res: ServResp, httpCode: HTTPStatusCode, msg: Res) {
  res.writeHead(httpCode, {
    "Content-type": "application/json"
  });
  res.end(JSON.stringify(msg));
}

export function readFileJsonAsync<T> (fname: string): Promise<T> {
  return new Promise(async (_resolve, _reject)=>{
    let result: T;
    try {
      result = JSON.parse( readFileSync(fname, "utf-8") );
    } catch (ex) {
      _reject(ex);
      return;
    }
    _resolve(result);
    return;
  });
}
