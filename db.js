import PocketBase from "pocketbase";
import { readFileJsonAsync } from "./utils.js";
export const dbState = {
  port: 8090
};
export async function db_init() {
  dbState.db = new PocketBase(`http://127.0.0.1:${dbState.port}`);
  let db = dbState.db;
  let {
    username,
    password
  } = await readFileJsonAsync("./pb.auth.json");
  let auth = await db.admins.authWithPassword(username, password);
  console.log("DataBase admin auth: ", db.authStore.isValid);
}
export async function db_user_exists(username) {
  let db = dbState.db;
  username = escape(username);
  let result = await db.collection("users").getFirstListItem(`username="${username}"`);
  return true;
}
export async function db_create_user(opts) {
  let db = dbState.db;
  let {
    username,
    password,
    passwordConfirm,
    name
  } = opts;
  try {
    if (await db_user_exists(username)) return false;
  } catch (ex) {
    //this is fine, if the resource exists then we want to cancel the creation anyways
  }
  let result;
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
export async function db_start_resource_map(map) {
  await dbState.db.collection("resources").subscribe("*", data => {
    let {
      url,
      id
    } = data.record;
    if (!map.has(url)) map.set(url, id);
  });
  let currentResources = await dbState.db.collection("resources").getFullList(32);
  for (let data of currentResources) {
    let {
      url,
      id
    } = data;
    if (!map.has(url)) map.set(url, id);
  }
}
export async function db_end_resource_map() {
  dbState.db.collection("resources").unsubscribe();
}
export async function db_update_resource_version(id) {
  let {
    version
  } = await dbState.db.collection("resources").getOne(id);
  version++;
  dbState.db.collection("resources").update(id, {
    version
  });
}