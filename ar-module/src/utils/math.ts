import * as THREE from 'three';
import {Vector3D} from '../types';

export function vector3DToThree(v: Vector3D): THREE.Vector3 {
    return new THREE.Vector3(v.x, v.y, v.z);
}

export function normalizeCoordinates(x: number, y: number, width: number, height: number): Vector3D {
    return {
        x: x / width,
        y: y / height,
        z: 0
    };
}

export function lerp(start: number, end: number, alpha: number): number {
    return start + (end - start) * alpha;
}

export function smoothDamp(
    current: number,
    target: number,
    velocity: { value: number },
    smoothTime: number,
    deltaTime: number
): number {
    const omega = 2 / smoothTime;
    const x = omega * deltaTime;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = current - target;
    const temp = (velocity.value + omega * change) * deltaTime;
    velocity.value = (velocity.value - omega * temp) * exp;
    return target + (change + temp) * exp;
}
