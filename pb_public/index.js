import { UIBuilder, exponent } from "@roguecircuitry/htmless";
import { authenticate, create_user } from "./db.js";
import { styles } from "./styles.js";
import { promptAsync } from "./ui/prompt.js";
export let LoginMethod;
(function (LoginMethod) {
  LoginMethod[LoginMethod["LOGIN"] = 0] = "LOGIN";
  LoginMethod[LoginMethod["REGISTER"] = 1] = "REGISTER";
})(LoginMethod || (LoginMethod = {}));
async function main() {
  //you should write less html :)
  let ui = new UIBuilder();

  //make everything use flex box
  ui.default(exponent);

  //custom styles for this page
  styles(ui);
  ui.mount(document.head);

  //create a container for everything
  ui.create("div").id("container").mount(document.body);
  let container = ui.e;
  let method = await promptAsync(ui, {
    title: "Authenticate",
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
  if (method.method === LoginMethod.LOGIN) {
    console.log("Login", method);
    let result = await authenticate(method.username, method.password, method.name);
    console.log("Login result", result);
  } else {
    let register = await promptAsync(ui, {
      title: "Register",
      config: [{
        key: "username",
        default: method.username,
        type: "string",
        label: "Username"
      }, {
        key: "password",
        default: method.password,
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
    console.log("Register", register);
    let result = await create_user(register.username, register.password, register.passwordConfirm, register.name);
    console.log("Register result", result);
  }
}
main();