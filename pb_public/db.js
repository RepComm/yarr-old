import PocketBase from "pocketbase";
import { state } from "./state.js";
export const dbState = {};
export async function db_init() {
  dbState.dbUrl = `${state.ssl ? "https" : "http"}://${state.host}`;
  dbState.db = new PocketBase(dbState.dbUrl);
}
export async function authenticate(opts) {
  let db = dbState.db;
  db.authStore.clear();
  let record;
  try {
    record = await db.collection("users").authWithPassword(opts.username, opts.password);
  } catch (ex) {
    return ex;
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
export async function create_user(opts) {
  let query = buildQueryParams(opts);
  let db = dbState.db;
  db.authStore.clear();
  let json;
  try {
    let resp = await fetch(`${state.serverUrl}/register${query}`);
    json = await resp.json();
  } catch (ex) {
    return ex;
  }
  return json;
}
export async function list_penguins() {
  let db = dbState.db;
  let result;
  try {
    //only allowed to retrieve where @request.auth.id = owner.id by database side
    result = await db.collection("penguins").getFullList(10, {
      // filter: "@request.auth.id = owner.id"
    });
  } catch (ex) {
    return ex;
  }
  return result;
}
export async function get_penguins(ids) {
  let promises = new Array();
  for (let id of ids) {
    promises.push(dbState.db.collection("penguins").getOne(id));
  }
  return await Promise.all(promises);
}
export async function create_penguin(opts) {
  let db = dbState.db;
  opts.owner = db.authStore.model.id;
  let result;
  try {
    result = await db.collection("penguins").create(opts);
  } catch (ex) {
    return ex;
  }
  return result;
}
export async function list_rooms(occupantId) {
  let db = dbState.db;
  let params = undefined;
  if (occupantId !== undefined) {
    params = {
      filter: `occupants.id="${occupantId}"`
    };
  }
  let rooms = await db.collection("rooms").getFullList(undefined, params);
  return rooms;
}
export async function get_room(name) {
  let db = dbState.db;
  let result = await db.collection("rooms").getFirstListItem(`name="${name}"`);
  return result;
}
export async function join_room(room, penguin) {
  let db = dbState.db;
  let rooms = await list_rooms(penguin.id);
  console.log("penguin", penguin.id, "in rooms", rooms);
  const promises = new Array();

  /**Remove from joined rooms*/
  for (let r of rooms) {
    if (r.id === room.id) continue;
    let index = r.occupants.indexOf(penguin.id);
    if (index < 0) continue;
    r.occupants.splice(index, 1);
    promises.push(db.collection("rooms").update(r.id, {
      occupants: r.occupants
    }));
  }

  //join just this one room
  room.occupants.push(penguin.id);
  promises.push(db.collection("rooms").update(room.id, {
    occupants: room.occupants
  }));

  //I think this batches the updates together?..
  return await Promise.all(promises);
}
export async function listen_room(room, callback) {
  let db = dbState.db;
  await db.collection("rooms").subscribe(room.id, callback);
}
export async function deafen_rooms() {
  let db = dbState.db;
  await db.collection("rooms").unsubscribe("*");
}