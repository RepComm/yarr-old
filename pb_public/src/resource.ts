
import { AnimationAction, Intersection, Light, LoopPingPong, Material, Mesh, MeshBasicMaterial, MeshToonMaterial, Object3D } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Anim } from "./anim.js";
import { DBResource, dbState, RelationId } from "./db.js";
import { state } from "./state.js";
// import { state } from "./state.js";
import { gltf_load, gltf_parse } from "./utils.js";

export type ResourceMap = Map<RelationId<DBResource>, Resource>;

export class Resource {
  static _all: ResourceMap;

  static get all (): ResourceMap {
    if (!Resource._all) Resource._all = new Map();
    return Resource._all;  
  }

  dbEntry: DBResource;

  constructor(dbEntry: DBResource) {
    this.dbEntry = dbEntry;
    if (Resource.all.has(dbEntry.id)) throw `Duplicate resource id ${dbEntry.id}`;
    Resource.all.set(dbEntry.id, this);
  }
}

export interface Object3DProviderChangeListener {
  (p: Object3DProvider): void;
}

export interface Object3DProvider {
  getObject(): Object3D;
  listen(cb: Object3DProviderChangeListener): void;
  deafen(cb: Object3DProviderChangeListener): void;
}

export class StaticObject3DProvider implements Object3DProvider {
  obj: Object3D;
  constructor (obj: Object3D) {
    this.obj = obj;
  }
  getObject(): Object3D {
    return this.obj;
  }
  listen(cb: Object3DProviderChangeListener): void {
    //do nothing, this is a static parent provider and won't change
  }
  deafen(cb: Object3DProviderChangeListener): void {
    //again, do nothing
  }
}

export interface ObjYarrUserDataJson {
  "hover-anim"?: string;
  "goto-room"?: string;
  "hover-anim-loop"?: number;
  "goto-minigame"?: string;
}
export interface ObjYarrUserData {
  "hover-anim"?: AnimationAction;
  "goto-room"?: string;
  "goto-minigame"?: string;
}

export interface MatYarrUserDataJson {
  toon?: string;
  invis?: string;
}

export interface InteractCallback<T,V> {
  (type: string, item: T, extra?: V): void;
}
export interface InteractItem<T extends Object, V> {
  data: WeakRef<T>;
  callback: InteractCallback<T, V>;
}
export const Interact = {
  store: new Map<string, Set<InteractItem<any, any>>>(),

  get<T,V>(type: string) {
    let list = Interact.store.get(type) as Set<InteractItem<T,V>>;

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
  add<T extends Object, V>(type: string, callback: InteractCallback<T, V>, data: T) {
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

export class ModelResource extends Resource implements Object3DProvider {
  gltf: GLTF;
  anim: Anim;

  cameraMountPoint: Object3D;
  
  getObject() {
    return this.gltf.scene;
  }
  changeListeners: Set<Object3DProviderChangeListener>;
  listen(cb: Object3DProviderChangeListener) {
    if (!this.changeListeners) this.changeListeners = new Set();
    this.changeListeners.add(cb);
  }
  deafen(cb: Object3DProviderChangeListener) {
    if (this.changeListeners) this.changeListeners.delete(cb);
    return this;
  }

  parentProvider: Object3DProvider;

  onParentChange: Object3DProviderChangeListener;

  constructor(dbEntry: DBResource) {
    super(dbEntry);

    //1
    this.onParentChange = (p: Object3DProvider) => {
      if (this.gltf && this.gltf.scene) p.getObject().add(this.gltf.scene);
    };

    //1
    dbState.db.collection("resources").subscribe<DBResource>(dbEntry.id, (data)=>{
      console.log("detected change, reloading resource", dbEntry.id);
      this.dbEntry = data.record;
      this.update();
    });

    //TODO - handle resource removal

    //1
    this.update();
  }

  //1
  mount(parentProvider: Object3DProvider): this {
    this.unmount();

    this.parentProvider = parentProvider;
    parentProvider.listen(this.onParentChange); //listen for when parent resource is reloaded

    this.onParentChange(parentProvider); //manually trigger when parent is set to another parent

    return this;
  }

  //1
  unmount(): this {
    if (this.parentProvider) {
      this.parentProvider.deafen(this.onParentChange);
    }

    this.parentProvider = null;

    if (this.gltf) this.gltf.scene.removeFromParent();

    return this;
  }

  //1
  private async update() {
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
      this.gltf = null;
    }

    //set the new one
    this.gltf = gltf;

    let materialNames = new Map<string, Material>();
    let lgt: Light;
    let mesh: Mesh;
    let mat: MeshBasicMaterial;
    
    //update the animation mixer for the new resource
    if (!this.anim) this.anim = new Anim();
    this.anim.config(gltf.scene, gltf.animations);

    this.gltf.scene.traverse((obj)=>{
      //get cameraMountPoint
      if (obj.name === "cameraMountPoint") {
        this.cameraMountPoint = obj;
        this.cameraMountPoint.getWorldPosition(state.camera.position);
        this.cameraMountPoint.getWorldQuaternion(state.camera.quaternion);
      }
      
      //correct lights
      if ( obj["isLight"] ) {
        lgt = obj as Light;
        lgt.intensity /= 1000;
      }

      let objUserDataJson: ObjYarrUserDataJson = obj.userData;
      let objUserData: ObjYarrUserData = obj.userData;

      let hoverAnim = objUserDataJson["hover-anim"];
      let hoverAnimLoop = objUserDataJson["hover-anim-loop"];

      if (hoverAnim !== undefined) {
        let action = this.anim.getAction(hoverAnim)||undefined;
        objUserData["hover-anim"] = action;
        if (action) {
          Interact.add<Object3D, Intersection>("hover", (type, item, intersection)=>{
            action.reset().play();
          }, obj);
          action.setLoop(LoopPingPong, hoverAnimLoop||1);
        }
      }
  
      let minigame = objUserDataJson["goto-minigame"];
      if (minigame !== undefined) {
        Interact.add("click", (type, item)=>{
          console.log("Play minigame", minigame);
        }, obj);
      }

      if (obj.name === "ground-clickable") {
        // out.groundClickable = obj;
        Interact.add("click", (type, item)=>{
          
        }, obj);
      }
  
      if (obj["isMesh"]) {
        mesh = obj as Mesh;
        mat = mesh.material as MeshBasicMaterial;
        
        let userData: MatYarrUserDataJson = mat.userData;

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
  }
}
