import { GameInput } from "@repcomm/gameinput-ts";
import { Cache, PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DEG2RAD } from "three/src/math/MathUtils.js";
import { Anim } from "./anim.js";
import { dbState, db_deafen_rooms, db_get_penguins, db_get_room, db_get_room_resources, db_join_room, db_listen_room, db_list_rooms } from "./db.js";
import { Debounce } from "./debounce.js";
import { Penguin } from "./penguin.js";
import { Interact, ModelResource, Resource, StaticObject3DProvider } from "./resource.js";
import { state } from "./state.js";
export async function getNetworkTime() {
  let result = 0;
  try {
    let resp = await fetch("/networktime");
    let json = await resp.json();
    result = json.now;
  } catch (ex) {
    console.warn("Failed to get /networktime", ex);
  }
  return result;
}
async function init_loaders() {
  Cache.enabled = false;
  state.gltfLoader = new GLTFLoader();
}
async function init_input() {
  let input = state.input = GameInput.get();
  input.addJsonConfig({
    buttons: [{
      id: "wave",
      influences: [{
        keys: ["w"]
      }]
    }]
  });
}
async function init_ui() {
  let ui = state.ui;
  let container = state.container;
  state.canvas = ui.create("canvas").id("canvas").mount(container).e;
}
async function init_renderer() {
  let renderer = state.renderer = new WebGLRenderer({
    canvas: state.canvas,
    alpha: false,
    antialias: true
  });
  // renderer.setPixelRatio(2);

  renderer.setClearColor("#477DEC");
}
async function init_scene() {
  state.sceneProvider = new StaticObject3DProvider(new Scene());
  let scene = state.sceneProvider.getObject();
  let camera = state.camera = new PerspectiveCamera(45, 1, 0.01, 200);
  camera.position.set(0, 20, 18);
  camera.rotateX(-45 * DEG2RAD);
  scene.add(camera);
}
function removePenguin(id) {
  let penguins = state.trackedPenguins;
  let penguin = penguins.get(id);
  if (!penguin) return;

  //stop displaying
  penguin.gltf.scene.removeFromParent();

  //remove from tracking
  penguins.delete(id);
}
function addPenguin(penguin) {
  let penguins = state.trackedPenguins;
  state.sceneProvider.getObject().add(penguin.gltf.scene);
  penguins.set(penguin.id, penguin);
}
async function init_penguins() {
  state.trackedPenguins = new Map();

  //spawn our local penguin
  state.localPenguin = await Penguin.create(state.selectedPenguin);
  addPenguin(state.localPenguin);
}
const update_penguin = async (penguin, data, teleport = false) => {
  // console.log("sub update", occupant.id);
  let color = data === null || data === void 0 ? void 0 : data.color;
  let state = data === null || data === void 0 ? void 0 : data.state;
  if (state) {
    penguin.setTarget(state.x, state.y, state.z, state.rx, state.ry, state.rz, teleport);
  }
  if (color) {
    penguin.setColorHex(color);
  }
};
async function populate_room() {
  let toRemove = new Set();
  let toAddIds = new Set();

  //remove penguins
  let currentRoomOccupants = new Set(state.currentRoom.occupants);
  for (let [id, p] of state.trackedPenguins) {
    if (id === state.localPenguin.id) continue;

    //TODO - remove penguins that haven't been updated in some time threshold
    if (!currentRoomOccupants.has(id)) toRemove.add(id);
  }
  for (let occupant of toRemove) {
    removePenguin(occupant);
    if (occupant === state.localPenguin.id) continue;
    dbState.db.collection("penguins").unsubscribe(occupant);
  }

  //add penguins
  for (let occupant of state.currentRoom.occupants) {
    if (!state.trackedPenguins.has(occupant)) {
      if (occupant === state.localPenguin.id) continue;
      toAddIds.add(occupant);
    }
  }
  let toAddData = await db_get_penguins(toAddIds);
  for (let occupant of toAddData) {
    if (occupant.id === state.localPenguin.id) continue;
    let createdPenguin = await Penguin.create(occupant);
    createdPenguin.setLocal(false);
    addPenguin(createdPenguin);
    dbState.db.collection("penguins").subscribe(occupant.id, data => update_penguin(createdPenguin, data.record));

    // update_penguin(createdPenguin, await dbState.db.collection("penguins").getOne<DBPenguin>(occupant.id), true);
  }
}

async function display_room() {
  let scene = state.sceneProvider.getObject();
  let resources = await db_get_room_resources(state.currentRoom);
  for (let resource of resources) {
    //database should reject anything that doesn't start with ./ anyways, but we force it here too
    if (!resource.url.startsWith("./")) continue;
    if (resource.type === "model") {
      let r = new ModelResource(resource).mount(state.sceneProvider);
      if (r.cameraMountPoint) {
        r.cameraMountPoint.getWorldPosition(state.camera.position);
        r.cameraMountPoint.getWorldQuaternion(state.camera.quaternion);
      }
    }
  }
}
async function switch_room(room) {
  await db_deafen_rooms();
  if (state.currentRoom) {
    for (let resId of state.currentRoom.resources) {
      let res = Resource.all.get(resId);
      Resource.all.delete(resId);
      console.log("unmount res", res);
      if (res) {
        res.unmount();
      }
    }
  }
  state.currentRoom = room;
  await db_listen_room(room, data => {
    Object.assign(state.currentRoom, data.record);
    populate_room();
  });
  db_join_room(room, state.selectedPenguin);
  await display_room();
}
async function init_room() {
  let rooms = await db_list_rooms();
  let randomRoomIndex = 0; //Math.floor((Math.random() * rooms.length * 10) % rooms.length);
  let randomRoom = rooms[randomRoomIndex];
  switch_room(randomRoom);
  state.switchRoom = async name => {
    if (name === state.currentRoom.name) {
      console.log("already in room", name);
      return;
    }
    Interact.clear();
    console.log("switch room", name);
    let room = await db_get_room(name);
    switch_room(room);
  };
}
async function init_time() {
  state.serverInitTime = await getNetworkTime();
  state.serverPredictedTime = state.serverInitTime;
}
const raycaster = new Raycaster();
let screenspaceTarget = new Vector2();
function raycast_mouse_single(evt, target) {
  let r = state.ui.ref(state.canvas).getRect();
  screenspaceTarget.set(evt.clientX / r.width * 2 - 1, (r.height - evt.clientY) / r.height * 2 - 1);
  raycaster.setFromCamera(screenspaceTarget, state.camera);
  const intersects = raycaster.intersectObject(target);
  if (!intersects || intersects.length < 1) return null;
  return intersects[0];
}
function raycast_mouse(evt, ...targets) {
  let r = state.ui.ref(state.canvas).getRect();
  screenspaceTarget.set(evt.clientX / r.width * 2 - 1, (r.height - evt.clientY) / r.height * 2 - 1);
  raycaster.setFromCamera(screenspaceTarget, state.camera);
  const intersects = raycaster.intersectObjects(targets);
  if (!intersects || intersects.length < 1) return null;
  return intersects;
}
async function render_loop() {
  const {
    ui,
    canvas,
    localPenguin,
    renderer,
    camera,
    input
  } = state;
  ui.ref(canvas).on("mousemove", evt => {
    let hoverables = Interact.get("hover");
    for (let hoverable of hoverables) {
      let item = hoverable.data.deref();
      if (item["isDisposed"]) {
        Interact.remove("hover", hoverable);
        continue;
      }
      let intersect = raycast_mouse_single(evt, item);
      if (intersect !== null) hoverable.callback("hover", item, intersect);
    }
  }).on("click", async evt => {
    let clickables = Interact.get("click");
    console.log("Clickables", clickables.size);
    for (let clickable of clickables) {
      let item = clickable.data.deref();
      if (item["isDisposed"]) {
        Interact.remove("click", clickable);
        continue;
      }

      // console.log("clickable", item);

      let intersect = raycast_mouse_single(evt, item);
      if (intersect !== null) {
        clickable.callback("click", item, intersect);

        //run custom code if the object is 'ground-clickable'
        if (item.name === "ground-clickable") {
          localPenguin.gltf.scene.lookAt(intersect.point);
          localPenguin.setTarget(intersect.point.x, intersect.point.y, intersect.point.z);

          //update database
          dbState.db.collection("penguins").update(localPenguin.id, {
            state: localPenguin.state,
            color: localPenguin.color.getHexString()
          }).catch(reason => {
            console.log(JSON.stringify(reason));
          });
        }
      }
    }
  });
  let resize = () => {
    state.ui.ref(state.canvas);
    let r = ui.getRect();
    if (r.width > window.innerWidth) r.width = window.innerWidth;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  };
  setTimeout(resize, 500);
  state.ui.ref(window).on("resize", resize);
  let timeLast = undefined;
  let timeDelta = 0;
  let timeDeltaS = 0;
  let genericDebounce = new Debounce(500);
  let scene = state.sceneProvider.getObject();
  const render = timeNow => {
    if (timeLast === undefined) timeLast = timeNow;
    timeDelta = timeNow - timeLast;
    timeLast = timeNow;
    timeDeltaS = timeDelta / 1000;
    state.serverPredictedTime += timeDelta;

    //schedule the next frame immediately to take advantage of event loop
    requestAnimationFrame(render);
    if (input.getButtonValue("wave") && genericDebounce.update()) {
      localPenguin.wave();
    }
    for (let [id, p] of state.trackedPenguins) {
      p.update(timeDeltaS, state.serverPredictedTime);
    }
    renderer.render(scene, camera);
    if (Anim._all) {
      for (let anim of Anim._all) {
        anim.mixer.update(timeDelta / 1000);
        // state.currentRoomAnim.mixer.setTime(state.serverPredictedTime / 1000);
      }
    }
  };

  requestAnimationFrame(render);
}
export async function client_start() {
  await init_input();
  await init_loaders();
  await init_ui();
  await init_time();
  await init_renderer();
  await init_scene();
  await init_penguins();
  await init_room();
  render_loop();
}