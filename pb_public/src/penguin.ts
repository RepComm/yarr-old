
import { Color, Euler, MeshToonMaterial, Vector3 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Anim } from "./anim.js";
import { DBPenguin, DBResource, dbState, PenguinState } from "./db.js";
import { ModelResource } from "./resource.js";
import { findChildByName, sceneGetAllMaterials } from "./utils.js";

export class Penguin {
  static resource: DBResource;
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

  res: ModelResource;

  static async create (dbp: DBPenguin) {
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
    result.penguinColorMaterial = materials.get("penguin-color") as MeshToonMaterial;

    result.setColorHex(dbp.color);
    result.name = dbp.name;
    result.id = dbp.id;
    
    result.setTarget(
      dbp.state.x,dbp.state.y,dbp.state.z,
      dbp.state.rx,dbp.state.ry,dbp.state.rz,
      true
    );

    return result;
  }

  walkSpeed: number;
  get gltf(): GLTF {
    return this.res.gltf;
  }
  get anim(): Anim {
    return this.res.anim;
  }

  name: string;
  id: string;
  room: string;
  penguinColorMaterial: MeshToonMaterial;

  target: Vector3;

  get rotation (): Euler {
    return this.gltf.scene.rotation;
  }

  get actual (): Vector3 {
    return this.gltf.scene.position;
  }

  dist: number;
  stopWaddleAnimTimeout: any;

  setLocal (local: boolean = true): this {
    findChildByName(this.gltf.scene, "local").visible = local;
    return this;
  }

  get color (): Color {
    return this.penguinColorMaterial.color;
  }
  setColorHex (hex: string) {
    let nextHex = hex;
    if (hex.charAt(0) == "#") nextHex = hex.substring(1);
    let colorInt = parseInt(nextHex, 16);
    
    this.color.setHex(colorInt);
  }

  constructor () {
    this.target = new Vector3();
    this.dist = 0;
    this.walkSpeed = 3;
  }

  setTarget (x: number, y: number, z: number, rx?: number, ry?: number, rz?: number, teleport: boolean = false) {
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

    this.stopWaddleAnimTimeout = setTimeout(()=>{
      this.anim.stop("waddle");
    }, 1000 * this.dist/this.walkSpeed);
  }

  wave () {
    this.anim.play("wave");
  }

  update (delta: number, absTime: number) {
    this.dist = this.actual.distanceTo(this.target);

    if (this.dist > 0.1) {
      this.actual.lerp(this.target, (delta * 1/this.dist) * this.walkSpeed);
    }

    this.anim.mixer.setTime(absTime/1000);
  }

  get state (): PenguinState {
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
