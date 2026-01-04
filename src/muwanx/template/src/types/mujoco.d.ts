import type { MainModule, MjModel, MjData } from 'mujoco-js';

// Create Mujoco type alias for convenience
export type Mujoco = MainModule;

declare module 'mujoco-js' {
    export interface MujocoFS {
        analyzePath(path: string, dontResolveLastLink?: boolean): { exists: boolean; isRoot: boolean; error: number };
    }

    export interface MainModule {
        mj_forward(model: MjModel, data: MjData): void;
        mj_step(model: MjModel, data: MjData): void;
        mjtGeom: {
            mjGEOM_BOX: { value: number };
            [key: string]: { value: number };
        };
        mjtLightType: {
            mjLIGHT_DIRECTIONAL: { value: number };
            mjLIGHT_POINT: { value: number };
            mjLIGHT_SPOT: { value: number };
            mjLIGHT_IMAGE: { value: number };
            [key: string]: { value: number };
        };
        mjtTexture: {
            mjTEXTURE_2D: { value: number };
            mjTEXTURE_CUBE: { value: number };
            [key: string]: { value: number };
        };
        mjtTextureRole: {
            mjTEXROLE_RGB: { value: number };
            mjNTEXROLE: { value: number };
            [key: string]: { value: number };
        };
    }
}
