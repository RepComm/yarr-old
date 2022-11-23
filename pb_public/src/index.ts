
import { UIBuilder, exponent } from "@roguecircuitry/htmless";
import { RecordAuthResponse } from "pocketbase";
import { authenticate, create_penguin, create_user, DBPenguin, DBUser, db_init, deafen_rooms, get_room, join_room, listen_room, list_penguins, list_rooms } from "./db.js";
import {styles} from "./styles.js";
import { prompt, promptAsync } from "./ui/prompt.js";

export enum LoginMethod {
  LOGIN,
  REGISTER
}

export interface AuthConfig {
  method: LoginMethod;
  username: string;
  password: string;
  passwordConfirm: string;
  name: string;
}

export interface PenguinSelection {
  index: number;
}

export interface State {
  ui?: UIBuilder;
}
export const state: State = {

};

async function pickPenguin () {
  let ui = state.ui;
  let penguins = await list_penguins() as Array<DBPenguin>;

  let penguinNames = new Array<string>();

  for (let penguin of penguins) {
    penguinNames.push(penguin.name);
  }
  penguinNames.push("Create New");

  let selection = await promptAsync<PenguinSelection>(ui, {
    cb: undefined,
    title: "Select / Create your penguin",
    config: [{
      key: "index",
      default: 0,
      type: "select",
      select: penguinNames,
      label: "Selection"
    }]
  });

  let selectedPenguin: DBPenguin;

  console.log("Selected penguin", selection);
  if (selection.index === penguinNames.length-1) {

    let creation = await promptAsync<DBPenguin>(ui, {
      cb: undefined,
      title: "Create your penguin",
      config: [{
        key: "name",
        default: "",
        type: "string",
        label: "Penguin Name"
      },{
        key: "color",
        default: "#ff00ff",
        type: "color",
        label: "Penguin Color"
      }]
    });

    let result = await create_penguin(creation) as DBPenguin;

    console.log("DB created penguin", result);

    selectedPenguin = result;
  } else {
    selectedPenguin = penguins[selection.index];
  }

  // let rooms = await list_rooms();

  await deafen_rooms();
  
  let room = await get_room("town");
  await listen_room(room, (data)=>{
    console.log("current room changed", selectedPenguin, data);
  });

  join_room(room, selectedPenguin);

}

async function init_ui() {
  state.ui = new UIBuilder();

  let ui = state.ui;

  //make everything use flex box
  ui.default(exponent);
  
  //custom styles for this page
  styles(ui); ui.mount(document.head);
  
  //create a container for everything
  ui.create("div").id("container").mount(document.body);
  let container = ui.e as HTMLDivElement;
}

async function auth_loop () {
  let ui = state.ui;


}

async function main () {
  
  await init_ui();

  await db_init();

  let method = await promptAsync<AuthConfig>(state.ui, {
    title: "Welcome to Yarr! - Authenticate",
    config: [{
      key: "method",
      default: LoginMethod.LOGIN,
      type: "select",
      select: ["Login", "Register"],
      label: "Method"
    },{
      key: "username",
      default: "",
      type: "string",
      label: "Username"
    },{
      key: "password",
      default: "",
      type: "password",
      label: "Password"
    }],
    cb: undefined
  });

  if (method.method === LoginMethod.LOGIN) {
    let result = await authenticate(method);

    let record = result as RecordAuthResponse<DBUser>;
    
    if(record.token) {
      pickPenguin();
    }
  } else {

    let register = await promptAsync<AuthConfig>(state.ui, {
      title: "Register",
      config: [{
        key: "username",
        default: method.username,
        type: "string",
        label: "Username"
      },{
        key: "password",
        default: method.password,
        type: "password",
        label: "Password"
      },{
        key: "passwordConfirm",
        default: "",
        type: "password",
        label: "Confirm Password"
      }],
      cb: undefined
    });

    let result = await create_user(register);

    if (!result || (result as any).error) {
      //error creating user
      alert(`Couldn't create user ${(result as any).error}`);
    } else {
      await authenticate(method); //create user still needs to authenticated

      pickPenguin();
    }
  }

}

main();
