import { stat } from "fs";

export interface State {
  host: string;
  ssl: boolean;
  serverUrl: string;
  serverPort: number;
}

export const state: State = {
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
