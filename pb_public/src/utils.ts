
import { Light, LoopPingPong, Material, Mesh, MeshBasicMaterial, MeshToonMaterial, Object3D } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { lerp } from "three/src/math/MathUtils.js";
import { Anim } from "./anim.js";

export function findChildByName(root: Object3D, name: string): Object3D {
  let result: Object3D;
  root.traverse((obj) => {
    if (obj.name === name) {
      result = obj;
      return;
    }
  });
  return result;
}

export function sceneGetAllMaterials(scene: Object3D, list?: Map<string, Material>): Map<string, Material> {
  if (list === undefined) list = new Map();
  let mc: Mesh;
  let mat: Material;

  scene.traverse((child) => {
    mc = child as Mesh;
    if (!mc.material) return;

    mat = mc.material as Material;

    list.set(mat.name, mat);
  });
  return list;
}


/**Modified from https://stackoverflow.com/a/17243070/8112809*/
export function HSVtoRGB(h: number, s: number, v: number) {
  h = clamp(h, 0, 1);
  s = clamp(s, 0, 1);
  v = clamp(v, 0, 1);

  let r: number, g: number, b: number;

  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function clamp(v: number, min: number = 0, max: number = 1): number {
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}
export function byteToHex(v: number) {
  v = clamp(v, 0, 255);
  let result = v.toString(16);
  if (result.length < 2) result = `0${result}`;
  return result;
}
export function scalarToByte(v: number): number {
  v = clamp(v);
  return Math.floor(v * 255);
}

export interface RGBLike {
  r: number;
  g: number;
  b: number;
}

export function rgbToHex(c: RGBLike): string {
  return `#${byteToHex(c.r)}${byteToHex(c.g)}${byteToHex(c.b)}`;
}

/**https://stackoverflow.com/a/5624139/8112809*/
export function hexToRgb(hex: string): RGBLike {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export const random = {
  between(min: number, max: number) {
    return lerp(min, max, Math.random());
  },
  byte(min: number = 0, max: number = 255) {
    min = clamp(min, 0, 255);
    max = clamp(max, 0, 255);
    return Math.floor(random.between(min, max));
  },
  bytehex(min?: number, max?: number) {
    return byteToHex(random.byte(min, max));
  },
  rgb(min: number, max: number): { r: number, g: number, b: number } {
    return HSVtoRGB(
      random.between(min, max),
      random.between(min, max),
      random.between(min, max)
    );
  },
  cssrgb(min: number, max: number): string {
    let { r, g, b } = random.rgb(min, max);
    return `rgb(${r},${g},${b})`;
  },
  rgbhex(min: number, max: number): string {
    return rgbToHex(HSVtoRGB(
      random.between(min, max),
      random.between(min, max),
      random.between(min, max)
    ));
  }
};

export type yarr_anim = Map<Object3D, string>;

export interface yarr_info {
  gltf?: GLTF;
  anim?: Anim;
  hoverAnims?: yarr_anim;
  cameraMountPoint?: Object3D;
}

export function yarrify_gltf (gltf: GLTF, out: yarr_info) {
  let scene = gltf.scene;

  out.anim = Anim.fromGLTF(gltf);

  let materialNames = new Map<string, Material>();

  let lgt: Light;
  let mesh: Mesh;
  let mat: MeshBasicMaterial;

  scene.traverse((obj)=>{
    // console.log(obj.name);
    if (obj.name === "cameraMountPoint") {
      out.cameraMountPoint = obj;
    }

    if ( obj["isLight"] ) {
      lgt = obj as Light;

      lgt.intensity /= 1000;
    }

    let hoverAnim = obj.userData["hover-anim"];
    let hoverAnimLoop = obj.userData["hover-anim-loop"];

    if (hoverAnim !== undefined) {
      if (!out.hoverAnims) out.hoverAnims = new Map();
      out.hoverAnims.set(obj, obj.userData["hover-anim"]);

      if (hoverAnimLoop !== undefined) {
        let action = out.anim.getAction(hoverAnim);
        if (action) action.setLoop(LoopPingPong, hoverAnimLoop);
      }

    }



    if (obj["isMesh"]) {
      mesh = obj as Mesh;
      mat = mesh.material as MeshBasicMaterial;

      if (mat.userData["invis"] == "true") {
        mat.visible = false;
      }

      if (mat.type !== "MeshToonMaterial" && mat.userData["toon"] !== "false") {

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
}
