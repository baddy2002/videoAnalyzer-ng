export interface ConnectionData {
    connection: [number, number]; // Indici dei landmark
    color: string; // Colore della connessione
    frame_number: number;
    diff: number;
    all_green?: boolean,
    in_box?: boolean,
}