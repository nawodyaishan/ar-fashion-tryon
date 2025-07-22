import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader';
import {GarmentData, PoseData, RenderOptions} from '../types';

export class GarmentRenderer {
    private scene: THREE.Scene;
    private garmentGroup: THREE.Group;
    private loader: GLTFLoader;
    private currentGarment: THREE.Object3D | null = null;
    private skeleton: THREE.Skeleton | null = null;
    private mixer: THREE.AnimationMixer | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.garmentGroup = new THREE.Group();
        this.scene.add(this.garmentGroup);

        // Setup loaders
        this.loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        this.loader.setDRACOLoader(dracoLoader);
    }

    async loadGarment(garmentData: GarmentData): Promise<void> {
        // Clear previous garment
        this.clearGarment();

        if (garmentData.modelUrl) {
            // Load 3D model
            const gltf = await this.loadModel(garmentData.modelUrl);
            this.currentGarment = gltf.scene;

            // Setup animations if available
            if (gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.currentGarment);
                const action = this.mixer.clipAction(gltf.animations[0]);
                action.play();
            }
        } else {
            // Create procedural garment mesh
            this.currentGarment = this.createProceduralGarment(garmentData);
        }

        this.garmentGroup.add(this.currentGarment);

        // Apply textures if provided
        if (garmentData.textureUrl) {
            await this.applyTexture(garmentData.textureUrl, garmentData.normalMapUrl);
        }
    }

    updatePose(poseData: PoseData): void {
        if (!this.currentGarment) return;

        // Get key pose points
        const leftShoulder = poseData.keypoints.find(kp => kp.name === 'left_shoulder');
        const rightShoulder = poseData.keypoints.find(kp => kp.name === 'right_shoulder');
        const leftHip = poseData.keypoints.find(kp => kp.name === 'left_hip');
        const rightHip = poseData.keypoints.find(kp => kp.name === 'right_hip');

        if (leftShoulder && rightShoulder) {
            // Calculate garment position
            const centerX = (leftShoulder.position.x + rightShoulder.position.x) / 2;
            const centerY = (leftShoulder.position.y + rightShoulder.position.y) / 2;

            // Convert normalized coordinates to world space
            this.currentGarment.position.set(
                (centerX - 0.5) * 2,
                -(centerY - 0.5) * 2,
                0
            );

            // Calculate rotation based on shoulder angle
            const shoulderAngle = Math.atan2(
                rightShoulder.position.y - leftShoulder.position.y,
                rightShoulder.position.x - leftShoulder.position.x
            );

            this.currentGarment.rotation.z = shoulderAngle;

            // Scale based on shoulder width
            const shoulderWidth = Math.sqrt(
                Math.pow(rightShoulder.position.x - leftShoulder.position.x, 2) +
                Math.pow(rightShoulder.position.y - leftShoulder.position.y, 2)
            );

            this.currentGarment.scale.setScalar(shoulderWidth * 5);
        }
    }

    update(deltaTime: number): void {
        // Update animations
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }

        // Update cloth physics (if implemented)
        // this.updateClothPhysics(deltaTime);
    }

    setRenderOptions(options: RenderOptions): void {
        this.currentGarment?.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                if (options.wireframe !== undefined) {
                    child.material.wireframe = options.wireframe;
                }
                if (options.opacity !== undefined) {
                    child.material.opacity = options.opacity;
                    child.material.transparent = options.opacity < 1;
                }
                if (options.metalness !== undefined) {
                    child.material.metalness = options.metalness;
                }
                if (options.roughness !== undefined) {
                    child.material.roughness = options.roughness;
                }
            }
        });
    }

    dispose(): void {
        this.clearGarment();
        this.scene.remove(this.garmentGroup);
    }

    private async loadModel(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => resolve(gltf),
                (progress) => console.log('Loading progress:', progress),
                (error) => reject(error)
            );
        });
    }

    private createProceduralGarment(garmentData: GarmentData): THREE.Object3D {
        const {width, height, depth} = garmentData.dimensions;

        // Create basic garment geometry based on type
        let geometry: THREE.BufferGeometry;

        switch (garmentData.type) {
            case 'shirt':
                geometry = this.createShirtGeometry(width, height);
                break;
            case 'pants':
                geometry = this.createPantsGeometry(width, height);
                break;
            case 'dress':
                geometry = this.createDressGeometry(width, height);
                break;
            default:
                geometry = new THREE.BoxGeometry(width, height, depth);
        }

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.2
        });

        return new THREE.Mesh(geometry, material);
    }

    private createShirtGeometry(width: number, height: number): THREE.BufferGeometry {
        // Create a simple shirt shape
        const shape = new THREE.Shape();

        // Body
        shape.moveTo(-width / 2, -height / 2);
        shape.lineTo(-width / 2, height / 3);
        shape.lineTo(-width / 4, height / 2);
        shape.lineTo(width / 4, height / 2);
        shape.lineTo(width / 2, height / 3);
        shape.lineTo(width / 2, -height / 2);
        shape.closePath();

        const extrudeSettings = {
            steps: 1,
            depth: 0.1,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 3
        };

        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    private createPantsGeometry(width: number, height: number): THREE.BufferGeometry {
        // Create simple pants shape
        const shape = new THREE.Shape();

        // Waist to crotch
        shape.moveTo(-width / 2, height / 2);
        shape.lineTo(-width / 2, 0);
        shape.lineTo(0, -height / 4);
        shape.lineTo(width / 2, 0);
        shape.lineTo(width / 2, height / 2);
        shape.closePath();

        return new THREE.ExtrudeGeometry(shape, {depth: 0.1});
    }

    private createDressGeometry(width: number, height: number): THREE.BufferGeometry {
        // Create simple dress shape
        const shape = new THREE.Shape();

        shape.moveTo(-width / 3, height / 2);
        shape.lineTo(-width / 2, -height / 2);
        shape.lineTo(width / 2, -height / 2);
        shape.lineTo(width / 3, height / 2);
        shape.closePath();

        return new THREE.ExtrudeGeometry(shape, {depth: 0.1});
    }

    private async applyTexture(textureUrl: string, normalMapUrl?: string): Promise<void> {
        const textureLoader = new THREE.TextureLoader();

        const texture = await textureLoader.loadAsync(textureUrl);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide
        });

        if (normalMapUrl) {
            const normalMap = await textureLoader.loadAsync(normalMapUrl);
            material.normalMap = normalMap;
        }

        // Apply material to all meshes in the garment
        this.currentGarment?.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = material;
            }
        });
    }

    private clearGarment(): void {
        if (this.currentGarment) {
            this.garmentGroup.remove(this.currentGarment);
            this.currentGarment.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.currentGarment = null;
        }

        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
    }
}
