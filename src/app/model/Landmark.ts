

export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility: number;
}

export interface FilteredLandmark extends Landmark {
    index: number; // Aggiungi l'indice ai tuoi keypoints
}