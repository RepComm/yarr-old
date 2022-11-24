import { AnimationAction, AnimationClip, AnimationMixer, LoopOnce, LoopPingPong, LoopRepeat, Object3D } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Anim {
  mixer: AnimationMixer;

  clips: Map<string, AnimationClip>;

  static fromGLTF (gltf: GLTF): Anim {
    return new Anim(gltf.scene, gltf.animations);
  }

  constructor (root: Object3D, clips: AnimationClip[]) {
    this.mixer = new AnimationMixer(root);

    this.mixer.addEventListener("finished", (evt)=>{
      // console.warn(evt.action);
      // (evt.action as AnimationAction).reset();
    });

    this.clips = new Map();

    for (let clip of clips) {

      let action = this.mixer.clipAction(clip);
      action.setLoop(LoopPingPong, 2);

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
    let action = this.getAction(name);
    let clip = this.getClip(name);
    
    // if (!action.isRunning) {
      action.reset();
      action.play();
    // }

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
