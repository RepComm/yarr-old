import { AnimationMixer, LoopPingPong } from "three";
export class Anim {
  static fromGLTF(gltf) {
    return new Anim(gltf.scene, gltf.animations);
  }
  constructor(root, clips) {
    this.mixer = new AnimationMixer(root);
    this.mixer.addEventListener("finished", evt => {
      console.warn(evt.action);
      // (evt.action as AnimationAction).reset();
    });

    this.clips = new Map();
    for (let clip of clips) {
      let action = this.mixer.clipAction(clip);
      action.setLoop(LoopPingPong, 2);
      this.clips.set(clip.name, clip);
    }
  }
  getClip(name) {
    return this.clips.get(name);
  }
  getAction(name) {
    return this.mixer.clipAction(this.getClip(name));
  }
  list() {
    let result = new Array();
    for (let [k, v] of this.clips) {
      result.push(k);
    }
    return result;
  }
  play(name) {
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

  stop(name) {
    if (!name) {
      for (let [k, v] of this.clips) {
        this.mixer.clipAction(v).stop();
      }
      return;
    }
    this.getAction(name).stop();
  }
}