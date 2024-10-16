import { EventEmitter } from "stream";

export interface InputConfig {
    type: string;
    id: string;
    name: string;
    ngModel: any | undefined | null; // Può essere string, number o file a seconda del tipo di input
    required: boolean;
    inputClass: string;
    isFileInput: boolean;
  }