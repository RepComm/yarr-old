
import { Euler, Material, MeshStandardMaterial, MeshToonMaterial, Vector3 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { convertToonMaterial, findChildByName, RGBLike, sceneGetAllMaterials } from "./utils.js";
import type { MsgJson, PlayerState } from "./api.js";
import { Anim } from "./anim.js";

let loader = new GLTFLoader();

export class Penguin {

  static gltf: GLTF;
  static getGltf (): Promise<GLTF> {
    return new Promise(async (_resolve, _reject)=>{
      if (Penguin.gltf) {
        _resolve(Penguin.gltf);
        return;
      }
      let result = await loader.loadAsync("./models/penguin.gltf");
      _resolve(result);
      return;
    });
  }

  static create (): Promise<Penguin> {
    return new Promise(async (_resolve, _reject)=>{
      let result = new Penguin();
      result.gltf = await Penguin.getGltf();

      convertToonMaterial(result.gltf.scene);

      result.anim = Anim.fromGLTF(result.gltf);
      result.anim.getAction("wave").timeScale = 4;
      result.anim.getAction("waddle").timeScale = 4;
      
      let materials = sceneGetAllMaterials(result.gltf.scene);
      result.penguinColorMaterial = materials.get("penguin-color") as MeshToonMaterial;
      // console.log(result.penguinColorMaterial);

      _resolve(result);
    });
  }

  walkSpeed: number;
  gltf: GLTF;
  anim: Anim;
  name: string;
  id: number;
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

  getColor (): RGBLike {
    let result: RGBLike = {r: 0, g: 0, b: 0};
    this.penguinColorMaterial.color.getRGB(result);
    return result;
  }

  setColor (c: RGBLike): this {
    this.penguinColorMaterial.color.setRGB(c.r, c.g, c.b);
    return this;
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
    this.anim.playForDuration("wave");
  }

  update (delta: number, absTime: number) {
    this.dist = this.actual.distanceTo(this.target);

    if (this.dist > 0.1) {
      this.actual.lerp(this.target, (delta * 1/this.dist) * this.walkSpeed);
    }

    this.anim.mixer.setTime(absTime/1000);
  }

  get state (): MsgJson<PlayerState> {
    return {
      type: "state",
      data: {
        id: this.id,
        x: this.target.x,
        y: this.target.y,
        z: this.target.z,
        rx: this.rotation.x,
        ry: this.rotation.y,
        rz: this.rotation.z,
        name: this.name,
        room: this.room,
        color: this.getColor()
      }
    };
  }
}
