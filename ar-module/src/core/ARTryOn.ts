import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {PoseDetector} from './PoseDetector';
import {GarmentRenderer} from './GarmentRenderer';
import {ARConfig, GarmentData} from '../types';

export class ARTryOn {
    private config: ARConfig;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls?: OrbitControls;
    private poseDetector: PoseDetector;
    private garmentRenderer: GarmentRenderer;
    private animationId?: number;
    private clock: THREE.Clock;

    constructor(config: ARConfig) {
        this.config = config;
        this.scene = new THREE.Scene();
        this.camera = this.createCamera();
        this.renderer = this.createRenderer();
        this.poseDetector = new PoseDetector();
        this.garmentRenderer = new GarmentRenderer(this.scene);
        this.clock = new THREE.Clock();
    }

    async initialize(): Promise<void> {
        // Initialize Three.js
        this.setupScene();
        this.setupLighting();

        if (this.config.debug) {
            this.setupDebugControls();
            this.addDebugHelpers();
        }

        // Initialize pose detection
        await this.poseDetector.initialize();

        // Start render loop
        this.animate();
    }

    async processFrame(imageData: ImageData | HTMLVideoElement): Promise<void> {
        // Detect pose
        const poseData = await this.poseDetector.detectPose(imageData);

        if (poseData) {
            // Update garment position based on pose
            this.garmentRenderer.updatePose(poseData);
        }
    }

    async loadGarment(garmentData: GarmentData): Promise<void> {
        await this.garmentRenderer.loadGarment(garmentData);
    }

    resize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    dispose(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.poseDetector.dispose();
        this.garmentRenderer.dispose();
        this.renderer.dispose();
        this.scene.clear();
    }

    // Utility methods
    captureScreenshot(): string {
        return this.renderer.domElement.toDataURL('image/png');
    }

    setDebugMode(enabled: boolean): void {
        this.config.debug = enabled;
        if (enabled && !this.controls) {
            this.setupDebugControls();
            this.addDebugHelpers();
        }
    }

    private createCamera(): THREE.PerspectiveCamera {
        const fov = this.config.cameraFOV || 75;
        const aspect = this.config.canvas.width / this.config.canvas.height;
        const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
        camera.position.set(0, 0, 5);
        return camera;
    }

    private createRenderer(): THREE.WebGLRenderer {
        const renderer = new THREE.WebGLRenderer({
            canvas: this.config.canvas,
            antialias: true,
            alpha: true
        });

        renderer.setSize(this.config.canvas.width, this.config.canvas.height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = this.config.enableShadows || false;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        return renderer;
    }

    private setupScene(): void {
        this.scene.background = null; // Transparent background
        this.scene.fog = new THREE.Fog(0xffffff, 10, 50);
    }

    private setupLighting(): void {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = this.config.enableShadows || false;

        if (directionalLight.castShadow) {
            directionalLight.shadow.camera.near = 0.1;
            directionalLight.shadow.camera.far = 50;
            directionalLight.shadow.camera.left = -10;
            directionalLight.shadow.camera.right = 10;
            directionalLight.shadow.camera.top = 10;
            directionalLight.shadow.camera.bottom = -10;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
        }

        this.scene.add(directionalLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x88ccff, 0.4);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
    }

    private setupDebugControls(): void {
        this.controls = new OrbitControls(this.camera, this.config.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 20;
    }

    private addDebugHelpers(): void {
        // Grid
        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);

        // Axes
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
    }

    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        const deltaTime = this.clock.getDelta();

        // Update controls if debug mode
        if (this.controls) {
            this.controls.update();
        }

        // Update garment physics/animation
        this.garmentRenderer.update(deltaTime);

        // Render scene
        this.renderer.render(this.scene, this.camera);
    };
}
