
import { GameInput } from "@repcomm/gameinput-ts";
import { DirectionalLight, Intersection, LoopPingPong, MeshStandardMaterial, Object3D, PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DEG2RAD, lerp } from "three/src/math/MathUtils.js";
import { Anim } from "./anim.js";
import { DBPenguin, DBRoom, dbState, deafen_rooms, get_penguins, join_room, listen_room, list_rooms, PenguinState, RelationId } from "./db.js";
import { Debounce } from "./debounce.js";
import { Penguin } from "./penguin.js";
import { state } from "./state.js";
import { findChildByName, sceneGetAllMaterials, yarrify_gltf, yarr_info } from "./utils.js";

export async function getNetworkTime () {
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

async function init_loaders () {
  state.gltfLoader = new GLTFLoader();
}

async function init_input () {
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

async function init_ui () {
  let ui = state.ui;
  let container = state.container;

  state.canvas = ui.create("canvas").id("canvas").mount(container).e as HTMLCanvasElement;
}

async function init_renderer () {
  let renderer = state.renderer = new WebGLRenderer({
    canvas: state.canvas,
    alpha: false,
    antialias: true
  });
  // renderer.setPixelRatio(2);

  renderer.setClearColor("#477DEC");
}

async function init_scene() {
  let scene = state.scene = new Scene();

  let camera = state.camera = new PerspectiveCamera(45, 1, 0.01, 200);
  camera.position.set(0, 20, 18);
  camera.rotateX(-45 * DEG2RAD);
  state.scene.add(camera);
}

function removePenguin (id: RelationId<DBPenguin>) {
  let penguins = state.trackedPenguins;

  let penguin = penguins.get(id);
  if (!penguin) return;

  //stop displaying
  penguin.gltf.scene.removeFromParent();

  //remove from tracking
  penguins.delete(id);
}

function addPenguin (penguin: Penguin) {
  let penguins = state.trackedPenguins

  state.scene.add(penguin.gltf.scene);
  penguins.set(penguin.id, penguin);
}

async function init_penguins () {
  state.trackedPenguins = new Map();

  //spawn our local penguin
  state.localPenguin = await Penguin.create(state.selectedPenguin);
  addPenguin(state.localPenguin);
}

const update_penguin = async (penguin: Penguin, data: DBPenguin, teleport: boolean = false)=> {
  // console.log("sub update", occupant.id);
  let color: string|undefined = data?.color;
  let state: PenguinState|undefined = data?.state;

  if (state) {
    penguin.setTarget(
      state.x,
      state.y,
      state.z,
      state.rx,
      state.ry,
      state.rz,
      teleport
    );
  }
  if (color) {
    penguin.setColorHex(color);
  }
}

async function populate_room () {
  let toRemove = new Set<string>();
  let toAddIds = new Set<string>();

  //remove penguins
  let currentRoomOccupants = new Set(state.currentRoom.occupants);
  for (let [id, p] of state.trackedPenguins) {
    if (id === state.localPenguin.id) continue;

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

  let toAddData = await get_penguins(toAddIds);
  for (let occupant of toAddData) {
    // if (occupant.id === state.localPenguin.id) continue;

    let createdPenguin = await Penguin.create(occupant);
    createdPenguin.setLocal(false);
    
    addPenguin(createdPenguin);

    dbState.db.collection("penguins").subscribe<DBPenguin>(occupant.id, (data)=>update_penguin(createdPenguin, data.record));
    
    update_penguin(createdPenguin, await dbState.db.collection("penguins").getOne<DBPenguin>(occupant.id), true);
  }

}

async function display_room () {
  let scene = state.scene;

  let townModel = await state.gltfLoader.loadAsync("./models/coffee-shop.gltf");

  let out = state.roomInfo = {} as yarr_info;
  yarrify_gltf(townModel, out);

  console.log("out", out);
  if (out.cameraMountPoint) {
    out.cameraMountPoint.getWorldPosition(state.camera.position);
    out.cameraMountPoint.getWorldQuaternion(state.camera.quaternion);
  }

  let materials = sceneGetAllMaterials(townModel.scene);
  // (materials.get("light-cone") as MeshStandardMaterial).emissiveIntensity = 24;
  let invisMat = materials.get("invisible");
  if (invisMat) invisMat.visible = false;

  state.groundClickable = findChildByName(townModel.scene, "ground-clickable");

  let currentRoomAnim = state.currentRoomAnim = Anim.fromGLTF(townModel);
  // currentRoomAnim.play();
  currentRoomAnim.getAction("door-swing").setLoop(LoopPingPong, 2);

  scene.add(townModel.scene);

  let sun = new DirectionalLight(0xffffff, 1.8);
  sun.target = scene;
  // sun.castShadow = true;
  scene.add(sun);
  sun.position.set(41, 1, 10);

  // window["sun"] = sun;
}

async function switch_room(room: DBRoom) {
  await deafen_rooms();

  state.currentRoom = room;

  await listen_room(room, (data)=>{
    Object.assign(state.currentRoom, data.record);

    populate_room();
  });

  join_room(room, state.selectedPenguin);

  await display_room();
}

async function init_room() {
  let rooms = await list_rooms();
  let randomRoomIndex = 0; //Math.floor((Math.random() * rooms.length * 10) % rooms.length);
  let randomRoom = rooms[randomRoomIndex];

  switch_room(randomRoom);
}

async function init_time () {
  state.serverInitTime = await getNetworkTime();
  state.serverPredictedTime = state.serverInitTime;
}

const raycaster = new Raycaster();
let screenspaceTarget = new Vector2();

function raycast_mouse (evt: MouseEvent, ...targets: Object3D[]): Intersection[] {
  let r = state.ui.ref(state.canvas).getRect();
  
  screenspaceTarget.set(
    (evt.clientX / r.width) * 2 - 1,
    ((r.height - evt.clientY) / r.height) * 2 - 1
  );

  raycaster.setFromCamera(screenspaceTarget, state.camera);
  
  const intersects = raycaster.intersectObjects(targets);
  if (!intersects || intersects.length < 1) return null;

  return intersects;
}

async function render_loop () {
  const {ui, canvas, localPenguin, renderer, scene, camera, input } = state;

  ui.ref(canvas)
  .on("mousemove", (evt)=>{
    
    if (state.roomInfo && state.roomInfo.hoverAnims) {
      let objs = new Array<Object3D>();
      for (let [obj, clipName] of state.roomInfo.hoverAnims) {
        objs.push(obj);
      }
      
      let intersections = raycast_mouse(evt, ...objs);
      if (!intersections) return;

      for (let intersection of intersections) {
        let clipName = state.roomInfo.hoverAnims.get( intersection.object );
        if (!clipName) clipName = state.roomInfo.hoverAnims.get( intersection.object.parent );

        if (!clipName) continue;

        state.currentRoomAnim.play(clipName);
      }

    }
  })
  .on("click", async (evt) => {
    if (!state.groundClickable) {
      console.warn("state.groundClickable is falsy! cannot click");
      return;
    }

    let intersects = raycast_mouse(evt, state.groundClickable);
    if (!intersects || intersects.length < 1) return;
    let intersect = intersects[0];

    localPenguin.gltf.scene.lookAt(intersect.point);

    localPenguin.setTarget(
      intersect.point.x, intersect.point.y, intersect.point.z
    );
    
    //update database
    dbState.db.collection("penguins").update<DBPenguin>(localPenguin.id, {
      state: localPenguin.state,
      color: localPenguin.color.getHexString()
    }).catch((reason)=>{
      console.log(JSON.stringify(reason));
    });
    
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
  state.ui.ref(window as any).on("resize", resize);

  let timeLast = undefined;
  let timeDelta = 0;
  let timeDeltaS = 0;

  let genericDebounce = new Debounce(500);

  const render = (timeNow: number) => {
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

    if (state.currentRoomAnim) {
      state.currentRoomAnim.mixer.update(timeDelta/1000);

      // state.currentRoomAnim.mixer.setTime(state.serverPredictedTime / 1000);
    }

  };

  requestAnimationFrame(render);
}

export async function client_start () {

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
