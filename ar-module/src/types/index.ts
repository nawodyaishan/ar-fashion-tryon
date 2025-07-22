export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

export interface Keypoint {
    position: Vector3D;
    visibility: number;
    name?: string;
}

export interface PoseData {
    keypoints: Keypoint[];
    timestamp: number;
    confidence: number;
}

export interface GarmentData {
    id: string;
    type: 'shirt' | 'pants' | 'dress' | 'skirt';
    modelUrl?: string;
    textureUrl?: string;
    normalMapUrl?: string;
    dimensions: {
        width: number;
        height: number;
        depth: number;
    };
}

export interface ARConfig {
    canvas: HTMLCanvasElement;
    videoElement?: HTMLVideoElement;
    enablePhysics?: boolean;
    enableShadows?: boolean;
    cameraFOV?: number;
    debug?: boolean;
}

export interface RenderOptions {
    wireframe?: boolean;
    opacity?: number;
    metalness?: number;
    roughness?: number;
}
