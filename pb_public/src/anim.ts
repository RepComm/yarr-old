import { AnimationAction, AnimationClip, AnimationMixer, Object3D } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Anim {
  mixer: AnimationMixer;

  clips: Map<string, AnimationClip>;

  static fromGLTF (gltf: GLTF): Anim {
    return new Anim(gltf.scene, gltf.animations);
  }

  constructor (root: Object3D, clips: AnimationClip[]) {
    this.mixer = new AnimationMixer(root);
    this.clips = new Map();

    for (let clip of clips) {
      this.clips.set(clip.name, clip);
    }
  }
  getClip (name: string): AnimationClip {
    return this.clips.get(name);
  }
  getAction (name: string): AnimationAction {
    return this.mixer.clipAction(this.getClip(name));
  }
  list (): string[] {
    let result = new Array<string>();
    for (let [k,v] of this.clips) {
      result.push(k);
    }
    return result;
  }
  play (name?: string) {
    if (!name) {
      for (let [k, v] of this.clips) {
        this.mixer.clipAction(v).reset().play();
      }
      return;
    }
    this.getAction(name).reset().play();
  }
  playForDuration (name: string) {
    let action = this.getAction(name).reset();

    let clip = this.getClip(name);

    console.log("wave", clip.duration, action.timeScale, clip.duration / action.timeScale);

    setTimeout(()=>{
      action.stop();
    }, (clip.duration * 1000) / action.timeScale );
    
    action.play();
  }
  stop (name?: string) {
    if (!name) {
      for (let [k, v] of this.clips) {
        this.mixer.clipAction(v).stop();
      }
      return;
    }
    this.getAction(name).stop();
  }

}
