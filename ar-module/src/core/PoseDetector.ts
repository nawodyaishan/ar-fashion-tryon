import {Pose, Results} from '@mediapipe/pose';
import {Keypoint, PoseData} from '../types';

export class PoseDetector {
    private pose: Pose | null = null;
    private isInitialized = false;
    private lastPoseData: PoseData | null = null;

    async initialize(): Promise<void> {
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.pose.onResults(this.onResults.bind(this));
        this.isInitialized = true;
    }

    async detectPose(input: ImageData | HTMLVideoElement | HTMLImageElement): Promise<PoseData | null> {
        if (!this.isInitialized || !this.pose) {
            throw new Error('PoseDetector not initialized');
        }

        // Reset last pose data
        this.lastPoseData = null;

        // Send input to MediaPipe
        await this.pose.send({image: input as any});

        // Return the processed result
        return this.lastPoseData;
    }

    dispose(): void {
        if (this.pose) {
            this.pose.close();
            this.pose = null;
        }
        this.isInitialized = false;
    }

    private onResults(results: Results): void {
        if (results.poseLandmarks) {
            const keypoints: Keypoint[] = results.poseLandmarks.map((landmark, index) => ({
                position: {
                    x: landmark.x,
                    y: landmark.y,
                    z: landmark.z || 0
                },
                visibility: landmark.visibility || 0,
                name: this.getKeypointName(index)
            }));

            this.lastPoseData = {
                keypoints,
                timestamp: Date.now(),
                confidence: this.calculateConfidence(keypoints)
            };
        }
    }

    private calculateConfidence(keypoints: Keypoint[]): number {
        const visibleKeypoints = keypoints.filter(kp => kp.visibility > 0.5);
        return visibleKeypoints.length / keypoints.length;
    }

    private getKeypointName(index: number): string {
        const names = [
            'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
            'right_eye_inner', 'right_eye', 'right_eye_outer',
            'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
            'left_index', 'right_index', 'left_thumb', 'right_thumb',
            'left_hip', 'right_hip', 'left_knee', 'right_knee',
            'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
            'left_foot_index', 'right_foot_index'
        ];
        return names[index] || `keypoint_${index}`;
    }
}
