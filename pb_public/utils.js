import { MeshToonMaterial } from "three";
import { lerp } from "three/src/math/MathUtils.js";
export function findChildByName(root, name) {
  let result;
  root.traverse(obj => {
    if (obj.name === name) {
      result = obj;
      return;
    }
  });
  return result;
}
export function sceneGetAllMaterials(scene, list) {
  if (list === undefined) list = new Map();
  let mc;
  let mat;
  scene.traverse(child => {
    mc = child;
    if (!mc.material) return;
    mat = mc.material;
    list.set(mat.name, mat);
  });
  return list;
}

/**Modified from https://stackoverflow.com/a/17243070/8112809*/
export function HSVtoRGB(h, s, v) {
  h = clamp(h, 0, 1);
  s = clamp(s, 0, 1);
  v = clamp(v, 0, 1);
  let r, g, b;
  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v, g = t, b = p;
      break;
    case 1:
      r = q, g = v, b = p;
      break;
    case 2:
      r = p, g = v, b = t;
      break;
    case 3:
      r = p, g = q, b = v;
      break;
    case 4:
      r = t, g = p, b = v;
      break;
    case 5:
      r = v, g = p, b = q;
      break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}
export function clamp(v, min = 0, max = 1) {
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}
export function byteToHex(v) {
  v = clamp(v, 0, 255);
  let result = v.toString(16);
  if (result.length < 2) result = `0${result}`;
  return result;
}
export function scalarToByte(v) {
  v = clamp(v);
  return Math.floor(v * 255);
}
export function rgbToHex(c) {
  return `#${byteToHex(c.r)}${byteToHex(c.g)}${byteToHex(c.b)}`;
}

/**https://stackoverflow.com/a/5624139/8112809*/
export function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
export const random = {
  between(min, max) {
    return lerp(min, max, Math.random());
  },
  byte(min = 0, max = 255) {
    min = clamp(min, 0, 255);
    max = clamp(max, 0, 255);
    return Math.floor(random.between(min, max));
  },
  bytehex(min, max) {
    return byteToHex(random.byte(min, max));
  },
  rgb(min, max) {
    return HSVtoRGB(random.between(min, max), random.between(min, max), random.between(min, max));
  },
  cssrgb(min, max) {
    let {
      r,
      g,
      b
    } = random.rgb(min, max);
    return `rgb(${r},${g},${b})`;
  },
  rgbhex(min, max) {
    return rgbToHex(HSVtoRGB(random.between(min, max), random.between(min, max), random.between(min, max)));
  }
};
export function yarrify_gltf(gltf, out) {
  let scene = gltf.scene;
  let materialNames = new Map();
  let lgt;
  let mesh;
  let mat;
  scene.traverse(obj => {
    // console.log(obj.name);
    if (obj.name === "cameraMountPoint") {
      out.cameraMountPoint = obj;
    }
    if (obj["isLight"]) {
      lgt = obj;

      // console.log(lgt);

      lgt.intensity /= 1000;
    }
    if (obj.userData["hover-anim"] !== undefined) {
      if (!out.hoverAnims) out.hoverAnims = new Map();
      out.hoverAnims.set(obj, obj.userData["hover-anim"]);
    }
    if (obj["isMesh"]) {
      mesh = obj;
      mat = mesh.material;
      if (mat.type !== "MeshToonMaterial" && mat.userData["toon"] !== false) {
        let nextMaterial = materialNames.get(mat.name);
        if (!nextMaterial) {
          nextMaterial = new MeshToonMaterial({
            color: mat.color,
            name: mat.name
          });
          materialNames.set(nextMaterial.name, nextMaterial);
        }
        mesh.material = nextMaterial;
      }
    }
  });
}