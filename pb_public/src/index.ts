
import { exponent, UIBuilder } from "@roguecircuitry/htmless";
import { RecordAuthResponse } from "pocketbase";
import { client_start } from "./client.js";
import { db_authenticate, db_create_penguin, db_create_user, DBPenguin, DBUser, db_init, db_get_own_penguins } from "./db.js";
import { AuthConfig, LoginMethod, state } from "./state.js";
import { styles } from "./styles.js";
import { promptAsync } from "./ui/prompt.js";

export interface PenguinSelection {
  index: number;
}

async function pick_penguin() {
  let ui = state.ui;
  
  let penguins = await db_get_own_penguins();

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

  state.selectedPenguin = undefined;

  // console.log("Selected penguin", selection);
  if (selection.index === penguinNames.length - 1) {

    let creation = await promptAsync<DBPenguin>(ui, {
      cb: undefined,
      title: "Create your penguin",
      config: [{
        key: "name",
        default: "",
        type: "string",
        label: "Penguin Name"
      }, {
        key: "color",
        default: "#ff00ff",
        type: "color",
        label: "Penguin Color"
      }]
    });

    let result = await db_create_penguin(creation) as DBPenguin;

    alert(`Successfully created penguin ${result.name}!`);
    // console.log("DB created penguin", result);

    state.selectedPenguin = result;
  } else {
    state.selectedPenguin = penguins[selection.index];
    alert(`Selected penguin ${state.selectedPenguin.name}`);
  }

}

async function ui_init() {
  state.ui = new UIBuilder();

  let ui = state.ui;

  //make everything use flex box
  ui.default(exponent);

  //custom styles for this page
  styles(ui); ui.mount(document.head);

  //create a container for everything
  ui.create("div").id("container").mount(document.body);
  state.container = ui.e as HTMLDivElement;
}

async function auth_loop() {
  let ui = state.ui;

  state.authConfig = {} as any;

  while (!state.authConfig.success) {
    await try_method();

    //if cancel was pressed, just try again..
    if (!state.authConfig.success) continue;
    
    //otherwise try to use whatever login method they chose
    if (state.authConfig.method === LoginMethod.LOGIN) {
      await try_login();
    } else {
      await try_register();
    }
  
    if (state.authConfig.success) {
      break;
    } else {
      alert(`Did not login successfully..`);
      continue;
    }

  }
}

async function try_register() {
  state.authConfig.success = false;

  let register = await promptAsync<AuthConfig>(state.ui, {
    title: "Register",
    config: [{
      key: "username",
      default: state.authConfig.username,
      type: "string",
      label: "Username"
    }, {
      key: "password",
      default: state.authConfig.password,
      type: "password",
      label: "Password"
    }, {
      key: "passwordConfirm",
      default: "",
      type: "password",
      label: "Confirm Password"
    }],
    cb: undefined
  });

  let result = await db_create_user(register);

  if (!result || (result as any).error) {
    //error creating user
    state.authConfig.success = false;
    alert(`Couldn't create user ${(result as any).error}`);
  } else {
    await db_authenticate(state.authConfig); //create user still needs to authenticated

    state.authConfig.success = true;
  }
}

async function try_method() {
  state.authConfig.success = false;
  let method = await promptAsync<AuthConfig>(state.ui, {
    title: "Welcome to Yarr! - Authenticate",
    config: [{
      key: "method",
      default: LoginMethod.LOGIN,
      type: "select",
      select: ["Login", "Register"],
      label: "Method"
    }, {
      key: "username",
      default: "",
      type: "string",
      label: "Username"
    }, {
      key: "password",
      default: "",
      type: "password",
      label: "Password"
    }],
    cb: undefined
  });
  Object.assign(state.authConfig, method);
  state.authConfig.success = true;
}

async function try_login() {
  state.authConfig.success = false;
  let result = await db_authenticate(state.authConfig);

  state.authResponse = result as RecordAuthResponse<DBUser>;

  if (state.authResponse.token) {
    state.authConfig.success = true;
  } else {
    state.authConfig.success = false;
  }
}

async function main() {

  //initialize UI
  await ui_init();

  //initialize database
  await db_init();

  //show auth screens until successful login
  await auth_loop();

  await pick_penguin();

  //start the client given the logged in user and picked penguin
  client_start();
}

main();
