import PocketBase from "pocketbase";
import { state } from "./state.js";
export const dbState = {};
export async function db_init() {
  dbState.dbPort = 8090;
  dbState.dbUrl = `${state.ssl ? "https" : "http"}://${state.host}:${dbState.dbPort}`;
  dbState.db = new PocketBase(dbState.dbUrl);
}
export async function authenticate(username, password, name) {
  let db = dbState.db;
  let record;
  try {
    record = await db.collection("users").authWithPassword(username, password);
  } catch (ex) {
    return false;
  }
  return record;
}
export function buildQueryParams(v) {
  let keys = Object.keys(v);
  let result = "";
  for (let key of keys) {
    if (v[key]) {
      result += `&${key}=${v[key].toString()}`;
    }
  }
  if (result.length < 1) return "";
  result = `?${result.substring(1)}`;
  return result;
}
export async function create_user(username, password, passwordConfirm, name) {
  let query = buildQueryParams({
    username,
    password,
    passwordConfirm,
    name
  });
  let json;
  try {
    let resp = await fetch(`${state.serverUrl}/register${query}`);
    json = await resp.json();
  } catch (ex) {
    console.warn(ex);
    return false;
  }
  return json;
}