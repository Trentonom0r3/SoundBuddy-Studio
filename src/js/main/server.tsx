import axios from 'axios';

interface IsolationRequest {
    file_path: string;
    model_name: string;
    device: string;
    shifts: number;
    two_stems: string | null;
    output_folder: string;
}

function createIsolationRequest(
    filePath: string,
    modelName: string,
    device: string,
    shifts: number,
    twoStems: string | null,
    output_folder: string
): IsolationRequest {
    if (twoStems === null) {
        twoStems = null;
    }
    return {
        file_path: filePath,
        model_name: modelName,
        device: device,
        shifts: shifts,
        two_stems: twoStems,
        output_folder: output_folder
    };
}

interface BeatDetectionRequest {
    file_path: string;
    hop_length?: number;
    sr?: number;
    start_bpm?: number;
    tightness?: number;
    output_folder: string;
}

function createBeatDetectionRequest(
    filePath: string,
    outputFolder: string,
    hopLength?: number,
    sampleRate?: number,
    startBpm?: number,
    tightness?: number
): BeatDetectionRequest {
    return {
        file_path: filePath,
        hop_length: hopLength,
        sr: sampleRate,
        start_bpm: startBpm,
        tightness: tightness,
        output_folder: outputFolder
    };
}

class FlaskClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async isolateAudio(data: IsolationRequest): Promise<string[]> {
        try {
            const response = await axios.post(`${this.baseUrl}/isolate`, data);
            return response.data.output_files;  // Adjusted to return the output_files array
        } catch (error) {
            console.error("Error isolating audio:", JSON.stringify(error)   );
            alert("Error isolating audio:" + error);
            throw new Error("Failed to isolate audio.");
        }
    }

    async detectBeats(data: BeatDetectionRequest): Promise<any> {
        try {
            const response = await axios.post(`${this.baseUrl}/beat-detection`, data);
            return response.data.results;  // Adjusted to return the results array
        } catch (error) {
            console.error("Error detecting beats:", error);
            alert("Error detecting beats:" + error);
            throw new Error("Failed to detect beats.");
        }
    }

    async getProgress(): Promise<number> {
        try {
            const response = await axios.get(`${this.baseUrl}/progress`, {
                responseType: 'stream'
            });
            let progress = 0;

            response.data.on('data', (chunk: Buffer) => {
                const data = chunk.toString().split('\n\n');
                for (const datum of data) {
                    if (datum.startsWith('data:')) {
                        progress = parseInt(datum.replace('data:', ''), 10);
                    }
                }
            });

            response.data.on('end', () => {
                console.log("Progress stream ended.");
            });

            return progress;
        } catch (error) {
            console.error("Error getting progress:", error);
            throw new Error("Failed to get progress.");
        }
    }
}

export { createIsolationRequest, createBeatDetectionRequest, FlaskClient };
