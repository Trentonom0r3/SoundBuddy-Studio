import json
import os
import librosa
from typing import List, Optional, Tuple, Dict, Union

class BeatTracker:
    """
    Helper class to facilitate beat tracking using librosa.

    Attributes:
        hop_length (int): Number of samples between successive frames.
        bpm (Optional[float]): Estimated tempo (beats per minute). If None, tempo will be estimated.
        start_bpm (float): Initial guess for the BPM.
        tightness (float): Tightness of beat distribution. Larger values lead to tighter distributions.
        trim (bool): Whether to trim silence at the beginning and end of the audio.
        sr (Optional[int]): Sample rate of the audio file. If None, defaults to 22050.
        audio_files (List[str]): List of audio files to process.
    """
    
    def __init__(self, hop_length: int = 512, bpm: Optional[float] = None, start_bpm: float = 120.0, 
                 tightness: float = 100.0, trim: bool = True, sr: Optional[int] = 22050, 
                 audio_files: Optional[List[str]] = None):
        self.hop_length = hop_length
        self.bpm = bpm
        self.start_bpm = start_bpm
        self.tightness = tightness
        self.trim = trim
        self.sr = sr
        self.audio_files = audio_files if audio_files else []
        
        self.validate_parameters()

    def validate_parameters(self):
        """
        Validate the parameters to ensure they are within acceptable values.
        
        Raises:
            ValueError: If any parameter is invalid.
        """
        if not isinstance(self.hop_length, int) or self.hop_length <= 0:
            raise ValueError(f"Invalid hop_length: {self.hop_length}. Must be a positive integer.")
        
        if self.bpm is not None and (not isinstance(self.bpm, (int, float)) or self.bpm <= 0):
            raise ValueError(f"Invalid bpm: {self.bpm}. Must be a positive number or None.")
        
        if not isinstance(self.start_bpm, (int, float)) or self.start_bpm <= 0:
            raise ValueError(f"Invalid start_bpm: {self.start_bpm}. Must be a positive number.")
        
        if not isinstance(self.tightness, (int, float)) or self.tightness <= 0:
            raise ValueError(f"Invalid tightness: {self.tightness}. Must be a positive number.")
        
        if not isinstance(self.trim, bool):
            raise ValueError(f"Invalid trim: {self.trim}. Must be a boolean value.")
        
        if self.sr is not None and (not isinstance(self.sr, int) or self.sr <= 0):
            raise ValueError(f"Invalid sr: {self.sr}. Must be a positive integer or None.")

    def add_audio_file(self, file_path: str):
        """
        Add an audio file to the list of files to be processed.

        Args:
            file_path (str): Path to the audio file.

        Raises:
            FileNotFoundError: If the file does not exist.
        """
        if os.path.exists(file_path):
            self.audio_files.append(file_path)
        else:
            raise FileNotFoundError(f"Audio file not found: {file_path}")

    def track_beats(self) -> List[Dict[str, Union[str, List[float], float]]]:
        """
        Track beats in the audio files.

        Returns:
            List[Dict[str, Union[str, List[float], float]]]: List of dictionaries containing file path, beat times, and estimated tempo.
        """
        results = []
        for file_path in self.audio_files:
            y, sr = librosa.load(file_path, sr=self.sr)
            
            if self.trim:
                y, _ = librosa.effects.trim(y)
            
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=self.hop_length, 
                                                         start_bpm=self.start_bpm, tightness=self.tightness)
            
            beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=self.hop_length)
            
            results.append({
                "file_path": file_path,
                "beat_times": beat_times.tolist(),
            })
        
        return results

    def save_beat_times(self, results: List[Dict[str, Union[str, List[float], float]]], output_folder: str):
        """
        Save the beat times to text files.

        Args:
            results (List[Dict[str, Union[str, List[float], float]]]): List of dictionaries containing file path, beat times, and estimated tempo.
            output_folder (str): Folder where the beat times will be saved.
        """
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
        
        for result in results:
            base_name = os.path.basename(result["file_path"])
            output_file = os.path.join(output_folder, f"{os.path.splitext(base_name)[0]}_beats.json")
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=4)
            print(f"Saved beat times to {output_file}")

def main():
    file_path = r"C:\Users\tjerf\Downloads\rocky_audio.wav"
    beat_tracker = BeatTracker()
    beat_tracker.add_audio_file(file_path)
    results = beat_tracker.track_beats()
    print(results)

if __name__ == "__main__":
    import cProfile
    import pstats

    profiler = cProfile.Profile()
    profiler.enable()

    main()

    profiler.disable()
    with open("profile_output.txt", "w") as f:
        stats = pstats.Stats(profiler, stream=f)
        stats.sort_stats(pstats.SortKey.TIME)
        stats.print_stats(25)
