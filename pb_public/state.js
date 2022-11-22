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