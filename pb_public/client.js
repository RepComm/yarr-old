import { GameInput } from "@repcomm/gameinput-ts";
import { DirectionalLight, PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DEG2RAD, lerp } from "three/src/math/MathUtils.js";
import { convertToonMaterial, sceneGetAllMaterials } from "./utils.js";
import { MsgHandler } from "./api.js";
import { Anim } from "./anim.js";
import { Debounce } from "./debounce.js";
import { Penguin } from "./penguin.js";
import { state } from "./state.js";
import { findChildByName } from "./utils.js";
let input = GameInput.get();
input.addJsonConfig({
  buttons: [{
    id: "wave",
    influences: [{
      keys: ["w"]
    }]
  }]
});
let loader = new GLTFLoader();
export async function client_start(ui, container, penguinConfig) {
  //create a canvas
  let canvas = ui.create("canvas").id("canvas").mount(container).e;

  //use three js webgl renderer on our canvas
  let renderer = new WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true
  });
  renderer.setClearColor("#477DEC");
  let scene = new Scene();
  let camera = new PerspectiveCamera(45, 1, 0.01, 200);
  camera.position.set(0, 20, 18);
  camera.rotateX(-45 * DEG2RAD);
  scene.add(camera);
  let penguins = new Map();
  function removePenguin(id) {
    let penguin = penguins.get(id);
    if (!penguin) return;

    //stop displaying
    penguin.gltf.scene.removeFromParent();

    //remove from tracking
    penguins.delete(id);
  }
  let localPenguin = await Penguin.create();
  localPenguin.name = penguinConfig.name;
  localPenguin.setColor(penguinConfig.color);
  let spawnRadius = 1;
  let msgHandler = new MsgHandler();
  msgHandler.listen("player-init-resp", async (sender, json) => {
    serverInitTime = json.data.now;
    serverPredictedTime = serverInitTime;
    // localPenguin.id = json.data.id;

    scene.add(localPenguin.gltf.scene);
    penguins.set(localPenguin.id, localPenguin);
    localPenguin.room = "town";
    localPenguin.setTarget(lerp(-spawnRadius, spawnRadius, Math.random()), 0, lerp(-spawnRadius, spawnRadius, Math.random()));
    ws.send(JSON.stringify(localPenguin.state)); //send player state to server for the first time

    //ask to be notified of room info
    ws.send(JSON.stringify({
      type: "query-room",
      data: {
        room: localPenguin.room,
        id: localPenguin.id
      }
    }));
  });
  async function handlePlayerState(sender, data, teleport = false) {
    if (data.id === undefined) return;
    let p = penguins.get(data.id);
    if (!p) {
      p = await Penguin.create();
      p.setLocal(false);
      if (data.color) p.setColor(data.color);
      scene.add(p.gltf.scene);
      p.id = data.id;
      penguins.set(p.id, p);
    }
    p.setTarget(data.x, data.y, data.z, data.rx, data.ry, data.rz, teleport);
  }
  msgHandler.listen("state", async (sender, json) => {
    handlePlayerState(sender, json.data);
  });
  msgHandler.listen("query-room-resp", (sender, json) => {
    let penguins = json.data.penguins;
    for (let penguin of penguins) {
      handlePlayerState(sender, penguin, true);
    }
  });
  msgHandler.listen("room-change", (sender, json) => {
    //if the player isn't in our room, we don't care
    if (json.data.oldRoom !== localPenguin.room) return;

    //if the player isn't in the same room as it as, stop showing it
    if (json.data.nextRoom !== json.data.oldRoom) {
      removePenguin(json.data.player);
    }
  });

  //for some reason creating a web socket before awaiting Penguin.create() has issues
  //I think the server manages to send data across before the listeners are attached
  let ws = new WebSocket(`${state.ssl ? "wss" : "ws"}://${state.host}`);
  ws.addEventListener("open", evt => {
    console.log("connected");
  });
  ws.addEventListener("close", evt => {
    console.log("disconnected");
    alert(`Disconnected, reason: ${evt.reason}`);
  });
  ws.addEventListener("error", evt => {
    console.warn("error", evt);
  });
  let serverInitTime = 0;
  let serverPredictedTime = 0;
  ws.addEventListener("message", evt => {
    let json;
    try {
      json = JSON.parse(evt.data);
    } catch (ex) {
      return;
    }
    console.log(json);
    msgHandler.process(ws, json);
  });
  let townModel = await loader.loadAsync("./models/town.gltf");
  convertToonMaterial(townModel.scene, (mesh, oldMat) => {
    if (oldMat.name === "light-cone") return false;
    return true;
  });
  let materials = sceneGetAllMaterials(townModel.scene);
  materials.get("light-cone").emissiveIntensity = 24;
  let invisMat = materials.get("invisible");
  if (invisMat) invisMat.visible = false;
  let groundClickable = findChildByName(townModel.scene, "ground-clickable");
  let roomAnim = Anim.fromGLTF(townModel);
  roomAnim.play();
  scene.add(townModel.scene);
  let sun = new DirectionalLight(0xffffff, 1.8);
  sun.target = scene;
  sun.castShadow = true;
  scene.add(sun);
  sun.position.set(41, 1, 10);

  // window["sun"] = sun;

  const raycaster = new Raycaster();
  let screenspaceTarget = new Vector2();
  ui.ref(canvas).on("click", evt => {
    screenspaceTarget.set(evt.clientX / canvas.width * 2 - 1, (canvas.height - evt.clientY) / canvas.height * 2 - 1);
    raycaster.setFromCamera(screenspaceTarget, camera);
    const intersects = raycaster.intersectObject(groundClickable);
    if (!intersects || intersects.length < 1) return;
    const intersect = intersects[0];
    localPenguin.setTarget(intersect.point.x, intersect.point.y, intersect.point.z);
    localPenguin.gltf.scene.lookAt(intersect.point);

    //networking update, why send the actual coords when we're going to lerp anyways
    ws.send(JSON.stringify(localPenguin.state));
  });
  let resize = () => {
    ui.ref(canvas);
    let r = ui.getRect();
    if (r.width > window.innerWidth) r.width = window.innerWidth;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  };
  setTimeout(resize, 500);
  ui.ref(window).on("resize", resize);
  let timeLast = undefined;
  let timeDelta = 0;
  let timeDeltaS = 0;
  let genericDebounce = new Debounce(500);
  const render = timeNow => {
    if (timeLast === undefined) timeLast = timeNow;
    timeDelta = timeNow - timeLast;
    timeLast = timeNow;
    timeDeltaS = timeDelta / 1000;
    serverPredictedTime += timeDelta;

    //schedule the next frame immediately to take advantage of event loop
    requestAnimationFrame(render);
    if (input.getButtonValue("wave") && genericDebounce.update()) {
      localPenguin.wave();
    }
    for (let [id, p] of penguins) {
      p.update(timeDeltaS, serverPredictedTime);
    }
    renderer.render(scene, camera);
    roomAnim.mixer.setTime(serverPredictedTime / 1000);
  };
  requestAnimationFrame(render);
}