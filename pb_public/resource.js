import { LoopPingPong, MeshToonMaterial } from "three";
import { Anim } from "./anim.js";
import { dbState } from "./db.js";
import { state } from "./state.js";
// import { state } from "./state.js";

export class Resource {
  static get all() {
    if (!Resource._all) Resource._all = new Map();
    return Resource._all;
  }
  constructor(dbEntry) {
    this.dbEntry = dbEntry;
    if (Resource.all.has(dbEntry.id)) return; //throw `Duplicate resource id ${dbEntry.id}`;
    Resource.all.set(dbEntry.id, this);
  }
}
export class StaticObject3DProvider {
  constructor(obj) {
    this.obj = obj;
  }
  getObject() {
    return this.obj;
  }
  listen(cb) {
    //do nothing, this is a static parent provider and won't change
  }
  deafen(cb) {
    //again, do nothing
  }
}
export const Interact = {
  store: new Map(),
  get(type) {
    let list = Interact.store.get(type);
    if (!list) {
      list = new Set();
      Interact.store.set(type, list);
      return list;
    }

    //clean up
    for (let item of list) {
      let target = item.data.deref();
      if (target === undefined) {
        list.delete(item);
        console.log("[Interact] Removing stale item");
      }
    }
    return list;
  },
  remove(type, item) {
    let list = Interact.store.get(type);
    list.delete(item);
  },
  add(type, callback, data) {
    Interact.get(type).add({
      callback,
      data: new WeakRef(data)
    });
  }
};

// let hoverables = Interact.get<Object3D>("hover");
// for (let h of hoverables) {
//   h.callback("hover", h);
// }

// Interact.add<Object3D>("hover", {
//   callback: (type, item) => {

//   },
//   data: {} as any
// })

export class ModelResource extends Resource {
  getObject() {
    return this.gltf.scene;
  }
  listen(cb) {
    if (!this.changeListeners) this.changeListeners = new Set();
    this.changeListeners.add(cb);
  }
  deafen(cb) {
    if (this.changeListeners) this.changeListeners.delete(cb);
    return this;
  }
  constructor(dbEntry) {
    super(dbEntry);

    //1
    this.onParentChange = p => {
      if (this.gltf && this.gltf.scene) p.getObject().add(this.gltf.scene);
    };

    //1
    dbState.db.collection("resources").subscribe(dbEntry.id, data => {
      console.log("detected change, reloading resource", dbEntry.id);
      this.dbEntry = data.record;
      this.update();
    });

    //TODO - handle resource removal

    //1
    this.update();
  }

  //1
  mount(parentProvider) {
    this.unmount();
    this.parentProvider = parentProvider;
    parentProvider.listen(this.onParentChange); //listen for when parent resource is reloaded

    this.onParentChange(parentProvider); //manually trigger when parent is set to another parent

    return this;
  }

  //1
  unmount() {
    if (this.parentProvider) {
      this.parentProvider.deafen(this.onParentChange);
    }
    this.parentProvider = null;
    if (this.gltf) this.gltf.scene.removeFromParent();
    return this;
  }

  //1
  async update() {
    //fetch the resource
    // let gltf = await gltf_load(this.dbEntry.url);

    let gltf = await state.gltfLoader.loadAsync(this.dbEntry.url);

    //if we have a previous version of this resource
    if (this.gltf) {
      //keep transformations of old resource
      gltf.scene.matrix.copy(this.gltf.scene.matrix);

      //get rid of references to hover/click objects
      this.cameraMountPoint = null;

      //dispose of the old stuff
      this.gltf.scene.removeFromParent();
      this.gltf.scene.traverse(obj => {
        obj["isDisposed"] = true;
        obj.userData = null;
        console.log("disposing of object", obj.name, obj["isDisposed"]);
        let m = obj;
        let mat;
        if (m.isMesh) {
          mat = m.material;
          if (m.geometry.dispose) m.geometry.dispose();
          if (mat.map && mat.map.dispose) mat.map.dispose();
          if (mat.dispose) mat.dispose();
        }
      });
      this.gltf = null;
    }

    //set the new one
    this.gltf = gltf;
    let materialNames = new Map();
    let lgt;
    let mesh;
    let mat;

    //update the animation mixer for the new resource
    if (!this.anim) this.anim = new Anim();
    this.anim.config(gltf.scene, gltf.animations);
    this.gltf.scene.traverse(obj => {
      //get cameraMountPoint
      if (obj.name === "cameraMountPoint") {
        this.cameraMountPoint = obj;
        this.cameraMountPoint.getWorldPosition(state.camera.position);
        this.cameraMountPoint.getWorldQuaternion(state.camera.quaternion);
      }

      //correct lights
      if (obj["isLight"]) {
        lgt = obj;
        lgt.intensity /= 1000;
      }
      let objUserDataJson = obj.userData;
      let objUserData = obj.userData;
      let hoverAnim = objUserDataJson["hover-anim"];
      let hoverAnimLoop = objUserDataJson["hover-anim-loop"];
      if (hoverAnim !== undefined) {
        let action = this.anim.getAction(hoverAnim) || undefined;
        objUserData["hover-anim"] = action;
        if (action) {
          Interact.add("hover", (type, item, intersection) => {
            action.reset().play();
          }, obj);
          action.setLoop(LoopPingPong, hoverAnimLoop || 1);
        }
      }
      let minigame = objUserDataJson["goto-minigame"];
      if (minigame !== undefined) {
        Interact.add("click", (type, item) => {
          console.log("Play minigame", minigame);
        }, obj);
      }
      if (obj.name === "ground-clickable") {
        // out.groundClickable = obj;
        Interact.add("click", (type, item) => {}, obj);
      }
      if (obj["isMesh"]) {
        mesh = obj;
        mat = mesh.material;
        let userData = mat.userData;
        if (userData.invis == "true") {
          mat.visible = false;
        }
        if (mat.type !== "MeshToonMaterial" && userData.toon !== "false") {
          let nextMaterial = materialNames.get(mat.name);
          if (!nextMaterial) {
            nextMaterial = new MeshToonMaterial({
              color: mat.color,
              name: mat.name,
              visible: mat.visible,
              map: mat.map
            });
            materialNames.set(nextMaterial.name, nextMaterial);
          }
          mesh.material = nextMaterial;
        }
      }
    });

    //if we're supposed to be mountd to a parent, do that again
    if (this.parentProvider) {
      this.parentProvider.getObject().add(this.gltf.scene);
    }

    //notify any children to reattach to new resource as they were with the old one
    if (this.changeListeners) for (let cb of this.changeListeners) cb(this);
    if (this.isLoaded) {
      this.waitForLoadEnd();
    }
  }
  get isLoaded() {
    return this.gltf !== undefined && this.gltf !== null;
  }
  waitForLoadEnd() {
    if (!this.waitForLoadCallbacks) return;
    for (let resolve of this.waitForLoadCallbacks) {
      resolve();
    }
    this.waitForLoadCallbacks.clear();
    this.waitForLoadCallbacks = null;
  }
  waitForLoad() {
    var _this = this;
    if (!this.waitForLoadCallbacks) this.waitForLoadCallbacks = new Set();
    return new Promise(async function (_resolve, _reject) {
      _this.waitForLoadCallbacks.add(_resolve);
      if (_this.isLoaded) {
        _this.waitForLoadEnd();
      }
    });
  }
}