
import { ConnectionData } from "./ConnectionData";
import { FilteredLandmark } from "./Landmark";



export interface DetailFrame {
    uuid: string; 
    frame_number: number;
    keypoints: FilteredLandmark[];
    connections: ConnectionData[]; // Indici dei landmark
    correct_keypoints: [number, number, number, number][];
}