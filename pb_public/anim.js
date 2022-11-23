import { AnimationMixer } from "three";
export class Anim {
  static fromGLTF(gltf) {
    return new Anim(gltf.scene, gltf.animations);
  }
  constructor(root, clips) {
    this.mixer = new AnimationMixer(root);
    this.clips = new Map();
    for (let clip of clips) {
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
    this.getAction(name).reset().play();
  }
  playForDuration(name) {
    let action = this.getAction(name).reset();
    let clip = this.getClip(name);
    console.log("wave", clip.duration, action.timeScale, clip.duration / action.timeScale);
    setTimeout(() => {
      action.stop();
    }, clip.duration * 1000 / action.timeScale);
    action.play();
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