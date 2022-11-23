export let LoginMethod;
(function (LoginMethod) {
  LoginMethod[LoginMethod["LOGIN"] = 0] = "LOGIN";
  LoginMethod[LoginMethod["REGISTER"] = 1] = "REGISTER";
})(LoginMethod || (LoginMethod = {}));
export const state = {
  host: window.location.host,
  ssl: window.location.protocol.startsWith("https"),
  serverUrl: undefined,
  serverPort: 10209
};
try {
  let port = parseInt(window.location.port);
  state.serverPort = port;
} catch (ex) {}
state.serverUrl = `${state.ssl ? "https" : "http"}://${state.host}`;