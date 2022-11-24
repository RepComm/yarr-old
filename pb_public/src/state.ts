
import type { GameInput } from "@repcomm/gameinput-ts";
import type { UIBuilder } from "@roguecircuitry/htmless";
import type { RecordAuthResponse } from "pocketbase";
import type { Object3D, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Anim } from "./anim.js";
import type { DBPenguin, DBRoom, DBUser } from "./db.js";
import type { Penguin } from "./penguin.js";
import { yarr_anim, yarr_info } from "./utils.js";

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
  success?: boolean;
}

export interface State {
  host: string;
  ssl: boolean;
  serverUrl: string;
  serverPort: number;

  ui?: UIBuilder;
  container?: HTMLDivElement;

  authConfig?: AuthConfig;
  authResponse?: RecordAuthResponse<DBUser>;
  selectedPenguin?: DBPenguin;
  localPenguin?: Penguin;

  serverInitTime?: number;
  serverPredictedTime?: number;

  gltfLoader?: GLTFLoader;
  canvas?: HTMLCanvasElement;
  scene?: Scene;
  camera?: PerspectiveCamera;
  trackedPenguins?: Map<string, Penguin>;
  currentRoom?: DBRoom;
  currentRoomAnim?: Anim;

  renderer?: WebGLRenderer;
  input?: GameInput;
  groundClickable?: Object3D;

  roomInfo?: yarr_info;
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
} catch (ex) { }

state.serverUrl = `${state.ssl ? "https" : "http"}://${state.host}`;
