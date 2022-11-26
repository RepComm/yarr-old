
import PocketBase from "pocketbase";
import { readFileJsonAsync } from "./utils.js";

export interface DBState {
  db?: PocketBase;
  port: number;
}

export const dbState: DBState = {
  port: 8090
};

interface PocketBaseAuth {
  username: string;
  password: string;
}

export async function db_init() {
  dbState.db = new PocketBase(`http://127.0.0.1:${dbState.port}`);

  let db = dbState.db;

  let {username, password} = await readFileJsonAsync<PocketBaseAuth>("./pb.auth.json");

  let auth = await db.admins.authWithPassword(username, password);

  console.log("DataBase admin auth: ", db.authStore.isValid);

}

export async function db_user_exists (username: string) {
  let db = dbState.db;

  username = escape(username);

  let result = await db.collection("users").getFirstListItem(`username="${username}"`);
  
  return true;
}

export interface OptsCreateUser {
  username: string;
  password: string;
  passwordConfirm: string;
  name?: string;
}

export async function db_create_user (opts: OptsCreateUser) {
  let db = dbState.db;

  let {username, password, passwordConfirm, name} = opts;

  try {
    if (await db_user_exists(username)) return false;
  } catch (ex) {
    //this is fine, if the resource exists then we want to cancel the creation anyways
  }
  
  let result: Record<any,any>;
  try {
    result = await db.collection("users").create({
      username,
      password,
      passwordConfirm,
      name,
      verified: true
    });
  } catch (ex) {
    console.warn(`Couldn't create user, but they don't already exist. Username: ${username}, isPasswordEmpty: ${password !== ""}, isPasswordConfirmEqual: ${password === passwordConfirm}`, ex);
    return false;
  }

  return result;
}

export interface DBResource {
  id: string;
  version: number;
  url: string;
}

export async function db_start_resource_map (map: Map<string, string>) {
  await dbState.db.collection("resources").subscribe<DBResource>("*", (data)=>{
    let {url, id} = data.record;
    if (!map.has(url)) map.set(url, id);
  });
  let currentResources = await dbState.db.collection("resources").getFullList<DBResource>(32);

  for (let data of currentResources) {
    let {url, id} = data;
    if (!map.has(url)) map.set(url, id);
  }
}

export async function db_end_resource_map () {
  dbState.db.collection("resources").unsubscribe();
}

export async function db_update_resource_version (id: string) {
  let {version} = await dbState.db.collection("resources").getOne<DBResource>(id);
  version ++;

  dbState.db.collection("resources").update<DBResource>(id, {
    version
  });
}
