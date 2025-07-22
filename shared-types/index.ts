export interface GarmentData {
    id: string;
    type: 'shirt' | 'pants' | 'dress';
    imageUrl: string;
    features: {
        color: string;
        pattern?: string;
        size: string[];
    };
}

export interface PoseKeypoints {
    landmarks: Array<{
        x: number;
        y: number;
        z?: number;
        visibility: number;
    }>;
}

export interface TryOnRequest {
    garmentId: string;
    userImage: string;
    poseData?: PoseKeypoints;
}
