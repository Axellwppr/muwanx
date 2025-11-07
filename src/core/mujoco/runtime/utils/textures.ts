import * as THREE from 'three';
import type { MjModel } from 'mujoco-js';

interface CreateTextureParams {
  mujoco: any;
  mjModel: MjModel;
  texId: number;
}

/**
 * Helper function to expand texture channels to RGBA format
 */
function expandChannelsToRGBA(src: Uint8Array, dest: Uint8Array, nchannel: number): void {
  switch (nchannel) {
    case 1: // L (Luminance)
      for (let i = 0, d = 0; i < src.length; i += 1, d += 4) {
        const l = src[i];
        dest[d + 0] = l;
        dest[d + 1] = l;
        dest[d + 2] = l;
        dest[d + 3] = 255;
      }
      break;
    case 2: // L+A (Luminance + Alpha)
      for (let i = 0, d = 0; i < src.length; i += 2, d += 4) {
        const l = src[i + 0];
        const a = src[i + 1];
        dest[d + 0] = l;
        dest[d + 1] = l;
        dest[d + 2] = l;
        dest[d + 3] = a;
      }
      break;
    case 3: // RGB
      for (let i = 0, d = 0; i < src.length; i += 3, d += 4) {
        dest[d + 0] = src[i + 0];
        dest[d + 1] = src[i + 1];
        dest[d + 2] = src[i + 2];
        dest[d + 3] = 255;
      }
      break;
    case 4: // RGBA
      dest.set(src);
      break;
  }
}

/**
 * Create a 2D texture from MuJoCo model data
 */
function create2DTexture(mujoco: any, mjModel: MjModel, texId: number): THREE.DataTexture | null {
  const width = mjModel.tex_width ? mjModel.tex_width[texId] : 0;
  const height = mjModel.tex_height ? mjModel.tex_height[texId] : 0;
  if (!width || !height) {
    return null;
  }

  const texAdr = mjModel.tex_adr ? mjModel.tex_adr[texId] : 0;
  const pixelCount = width * height;

  // Per MuJoCo docs, textures are packed into tex_data with per-texture
  // start address (tex_adr) and channel count (tex_nchannel).
  const nchannel = mjModel.tex_nchannel ? mjModel.tex_nchannel[texId] : 0;
  const srcByteCount = pixelCount * nchannel;

  let textureData = new Uint8Array(pixelCount * 4);
  let hasValidData = false;
  if (mjModel.tex_data && nchannel >= 1 && nchannel <= 4 && mjModel.tex_data.length >= texAdr + srcByteCount) {
    const src = mjModel.tex_data.subarray(texAdr, texAdr + srcByteCount);
    expandChannelsToRGBA(src, textureData, nchannel);
    hasValidData = true;
  }

  if (!hasValidData) {
    return null;
  }

  const texture = new THREE.DataTexture(textureData, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.needsUpdate = true;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;  // Or set dynamically via renderer.capabilities.getMaxAnisotropy()
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;

  // Respect MuJoCo tex_colorspace when available
  if (mjModel.tex_colorspace) {
    const cs = mjModel.tex_colorspace[texId];
    // mjCOLORSPACE_SRGB -> sRGB encoding; LINEAR/AUTO -> keep default
    if (cs === mujoco.mjtColorSpace.mjCOLORSPACE_SRGB.value && 'sRGBEncoding' in THREE) {
      texture.encoding = THREE.sRGBEncoding;
    }
  }

  return texture;
}

/**
 * Create a cube texture from MuJoCo model data
 */
function createCubeTexture(mujoco: any, mjModel: MjModel, texId: number): THREE.CubeTexture | null {
  const width: number = mjModel.tex_width ? mjModel.tex_width[texId] : 0;
  const height: number = mjModel.tex_height ? mjModel.tex_height[texId] : 0;

  if (!width || !height) {
    return null;
  }

  const texAdr = mjModel.tex_adr ? mjModel.tex_adr[texId] : 0;
  const nchannel = mjModel.tex_nchannel ? mjModel.tex_nchannel[texId] : 0;

  // A cubemap has 6 faces; each face is width x height in size
  const facePixelCount = width * height;
  const faceSrcByteCount = facePixelCount * nchannel;

  // Prepare texture data for all 6 faces
  const faces = [];
  const faceOrder = [
    'px', 'nx',  // positive-x, negative-x
    'py', 'ny',  // positive-y, negative-y
    'pz', 'nz'   // positive-z, negative-z
  ];

  for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
    const faceOffset = texAdr + (faceIdx * faceSrcByteCount);
    const faceData = new Uint8Array(facePixelCount * 4);  // RGBA

    if (mjModel.tex_data && nchannel >= 1 && nchannel <= 4 &&
      mjModel.tex_data.length >= faceOffset + faceSrcByteCount) {

      const src = mjModel.tex_data.subarray(faceOffset, faceOffset + faceSrcByteCount);

      // Convert to RGBA based on the number of channels
      expandChannelsToRGBA(src, faceData, nchannel);
      faces.push(faceData);
    } else {
      return null;
    }
  }

  // Create a THREE.js CubeTexture
  const cubeTexture = new THREE.CubeTexture();

  // Create a DataTexture for each face and assign it to the cube texture
  cubeTexture.image = faces.map(faceData => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(faceData);
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  });

  cubeTexture.needsUpdate = true;
  cubeTexture.format = THREE.RGBAFormat;

  // Set color space
  if (mjModel.tex_colorspace) {
    const cs = mjModel.tex_colorspace[texId];
    if (cs === mujoco.mjtColorSpace.mjCOLORSPACE_SRGB.value && 'sRGBEncoding' in THREE) {
      cubeTexture.encoding = THREE.sRGBEncoding;
    }
  }

  return cubeTexture;
}

/**
 * Create a texture from MuJoCo model data based on texture type
 * @returns THREE.Texture or null if texture creation fails
 */
export function createTexture({ mujoco, mjModel, texId }: CreateTextureParams): THREE.Texture | null {
  if (!mjModel || texId < 0) {
    return null;
  }

  const type = mjModel.tex_type ? mjModel.tex_type[texId] : mujoco.mjtTexture.mjTEXTURE_2D.value;

  if (type === mujoco.mjtTexture.mjTEXTURE_2D.value) {
    return create2DTexture(mujoco, mjModel, texId);
  }

  if (type === mujoco.mjtTexture.mjTEXTURE_CUBE.value) {
    // return createCubeTexture(mujoco, mjModel, texId);
  }

  console.warn(`Unsupported texture type ${type} for texId: ${texId}`);
  return null;
}
