
import { AnimationAction, AnimationClip, AnimationMixer, Object3D } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Anim {
  static _all: Set<Anim>;
  static get all (): Set<Anim> {
    if (!Anim._all) Anim._all = new Set();
    return Anim._all;
  }
  mixer: AnimationMixer;

  clips: Map<string, AnimationClip>;

  static fromGLTF(gltf: GLTF): Anim {
    return new Anim(gltf.scene, gltf.animations);
  }

  constructor(root?: Object3D, clips?: AnimationClip[]) {
    if (root && clips) this.config(root, clips);
  }
  config (root: Object3D, clips: AnimationClip[]) {
    
    if (this.mixer) this.mixer.stopAllAction();

    Anim.all.add(this); //TODO handle removal of anim

    this.mixer = new AnimationMixer(root);

    this.clips = new Map();

    for (let clip of clips) {
      this.clips.set(clip.name, clip);
    }
  }
  getClip(name: string): AnimationClip {
    return this.clips.get(name);
  }
  getAction(name: string): AnimationAction {
    return this.mixer.clipAction(this.getClip(name));
  }
  list(): string[] {
    let result = new Array<string>();
    for (let [k, v] of this.clips) {
      result.push(k);
    }
    return result;
  }
  play(name?: string) {
    if (!name) {
      for (let [k, v] of this.clips) {
        this.mixer.clipAction(v).reset().play();
      }
      return;
    }
    let action = this.getAction(name);

    // if (!action.isRunning) {
    action.reset();
    action.play();
    // }

  }
  stop(name?: string) {
    if (!name) {
      for (let [k, v] of this.clips) {
        this.mixer.clipAction(v).stop();
      }
      return;
    }
    this.getAction(name).stop();
  }

}
