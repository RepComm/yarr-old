
import PocketBase, { RecordAuthResponse, RecordSubscription } from "pocketbase";
import { state } from "./state.js";

export interface DBState {
  dbUrl?: string;
  db?: PocketBase;
}

export const dbState: DBState = {
  
};

export async function db_init () {
  dbState.dbUrl = `${state.ssl ? "https" : "http"}://${state.host}`;
  dbState.db = new PocketBase(dbState.dbUrl);
}

export interface CollectionItem {
  id?: string;
}
export interface DBUser extends CollectionItem {
  username: string;
  name: string;
}
export interface OptsAuth {
  username: string;
  password: string;
}
export async function authenticate (opts: OptsAuth) {
  let db = dbState.db;

  db.authStore.clear();

  let record: RecordAuthResponse<DBUser>;
  try {
    record = await db.collection("users").authWithPassword<DBUser>(opts.username, opts.password);
  } catch (ex) {
    return ex as string;
  }

  return record;
}

export function buildQueryParams (v: any): string {
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

export interface OptsCreateUser {
  username: string;
  password: string;
  passwordConfirm: string;
  name?: string;
}

export async function create_user (opts: OptsCreateUser) {
  let query = buildQueryParams(opts);

  let db = dbState.db;

  db.authStore.clear();

  let json: Record<any,any>;
  try {
    let resp = await fetch(`${state.serverUrl}/register${query}`);
    json = await resp.json();
  } catch (ex) {
    return ex as string;
  }
  return json;

}

export interface PenguinState {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export type RelationId<T extends CollectionItem> = string;

export interface DBPenguin extends CollectionItem {
  state?: PenguinState;
  color: string;
  name: string;
  owner?: RelationId<DBUser>;
}

/**Get a list of penguins by their ID*/
export async function get_penguins (ids: Set<string>) {
  let promises = new Array<Promise<DBPenguin>>();

  for (let id of ids) {
    promises.push(dbState.db.collection("penguins").getOne<DBPenguin>(id));
  }

  return await Promise.all(promises);
}

/**Get a list of the current logged in user's penguins*/
export async function get_own_penguins () {
  return await dbState.db.collection("penguins").getFullList<DBPenguin>(10, {
    filter: `owner.id="${dbState.db.authStore.model.id}"`
  });
}

export async function create_penguin (opts: DBPenguin) {
  let db = dbState.db;

  opts.owner = db.authStore.model.id;

  let result: DBPenguin;
  try {
    result = await db.collection("penguins").create<DBPenguin>(opts);
  } catch (ex) {
    return ex as string;
  }

  return result;
}

export interface DBRoom extends CollectionItem {
  name: string;
  occupants: Array<RelationId<DBPenguin>>;
}

export async function list_rooms (occupantId?: string) {
  let db = dbState.db;

  let params = undefined;
  if (occupantId !== undefined) {
    params = {
      filter: `occupants.id="${occupantId}"`
    };
  }

  let rooms = await db.collection("rooms").getFullList<DBRoom>(undefined, params);

  return rooms;
}

export async function get_room (name: string) {
  let db = dbState.db;

  let result = await db.collection("rooms").getFirstListItem<DBRoom>(`name="${name}"`);

  return result;
}

export async function join_room (room: DBRoom, penguin: DBPenguin) {
  let db = dbState.db;

  let rooms = await list_rooms(penguin.id);

  const promises = new Array();

  /**Remove from joined rooms*/
  for (let r of rooms) {
    if (r.id === room.id) continue;

    let index = r.occupants.indexOf(penguin.id);
    if (index < 0) continue;

    r.occupants.splice(index, 1);

    promises.push( db.collection("rooms").update(r.id, {
      occupants: r.occupants
    }) );
  }

  //join just this one room
  room.occupants.push(penguin.id);
  promises.push( db.collection("rooms").update(room.id, {
    occupants: room.occupants
  }));

  //I think this batches the updates together?..
  return await Promise.all(promises);
}

export async function listen_room (room: DBRoom, callback: (data: RecordSubscription<DBRoom>) => void) {
  let db = dbState.db;
  await db.collection("rooms").subscribe(room.id, callback);
}

export async function deafen_rooms() {
  let db = dbState.db;
  await db.collection("rooms").unsubscribe("*");
}
