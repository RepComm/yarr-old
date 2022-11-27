import { Vector3 } from "three";
import { dbState } from "./db.js";
import { ModelResource } from "./resource.js";
import { findChildByName, sceneGetAllMaterials } from "./utils.js";
export class Penguin {
  /*static gltf: GLTF;
  static getGltf (): Promise<GLTF> {
    return new Promise(async (_resolve, _reject)=>{
      if (Penguin.gltf) {
        _resolve(Penguin.gltf);
        return;
      }
        let result = await loader.loadAsync("./models/penguin.glb");
      _resolve(result);
      return;
    });
  }*/

  static async create(dbp) {
    let result = new Penguin();
    if (!Penguin.resource) {
      Penguin.resource = await dbState.db.collection("resources").getFirstListItem("name=\"penguin\"");
      console.log("Penguin Resource", Penguin.resource);
    }
    result.res = new ModelResource(Penguin.resource);
    await result.res.waitForLoad();

    // result.anim = Anim.fromGLTF(result.gltf);
    result.anim.getAction("wave").timeScale = 4;
    result.anim.getAction("waddle").timeScale = 4;
    let materials = sceneGetAllMaterials(result.gltf.scene);
    result.penguinColorMaterial = materials.get("penguin-color");
    result.setColorHex(dbp.color);
    result.name = dbp.name;
    result.id = dbp.id;
    result.setTarget(dbp.state.x, dbp.state.y, dbp.state.z, dbp.state.rx, dbp.state.ry, dbp.state.rz, true);
    return result;
  }
  get gltf() {
    return this.res.gltf;
  }
  get anim() {
    return this.res.anim;
  }
  get rotation() {
    return this.gltf.scene.rotation;
  }
  get actual() {
    return this.gltf.scene.position;
  }
  setLocal(local = true) {
    findChildByName(this.gltf.scene, "local").visible = local;
    return this;
  }
  get color() {
    return this.penguinColorMaterial.color;
  }
  setColorHex(hex) {
    let nextHex = hex;
    if (hex.charAt(0) == "#") nextHex = hex.substring(1);
    let colorInt = parseInt(nextHex, 16);
    this.color.setHex(colorInt);
  }
  constructor() {
    this.target = new Vector3();
    this.dist = 0;
    this.walkSpeed = 3;
  }
  setTarget(x, y, z, rx, ry, rz, teleport = false) {
    this.target.set(x, y, z);
    if (rx !== undefined && ry !== undefined && rz !== undefined) {
      this.gltf.scene.rotation.set(rx, ry, rz);
    }
    if (teleport) {
      this.actual.copy(this.target);
      return;
    }
    this.anim.play("waddle");
    this.dist = this.target.distanceTo(this.actual);
    if (this.stopWaddleAnimTimeout) {
      clearTimeout(this.stopWaddleAnimTimeout);
      this.stopWaddleAnimTimeout = null;
    }
    this.stopWaddleAnimTimeout = setTimeout(() => {
      this.anim.stop("waddle");
    }, 1000 * this.dist / this.walkSpeed);
  }
  wave() {
    this.anim.play("wave");
  }
  update(delta, absTime) {
    this.dist = this.actual.distanceTo(this.target);
    if (this.dist > 0.1) {
      this.actual.lerp(this.target, delta * 1 / this.dist * this.walkSpeed);
    }
    this.anim.mixer.setTime(absTime / 1000);
  }
  get state() {
    return {
      x: this.target.x,
      y: this.target.y,
      z: this.target.z,
      rx: this.rotation.x,
      ry: this.rotation.y,
      rz: this.rotation.z
    };
  }
}