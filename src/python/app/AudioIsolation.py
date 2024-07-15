import os
import subprocess
import librosa
from typing import List, Optional, Union
import uuid

class DemucsHelper:
    """
    Helper class to facilitate the use of the Demucs command for music source separation.
    """

    VALID_MODELS = {'htdemucs', 'htdemucs_ft', 'htdemucs_6s', 'hdemucs_mmi', 'mdx', 'mdx_extra', 'mdx_q', 'mdx_extra_q'}
    VALID_DEVICES = {'cpu', 'cuda'}
    VALID_STEMS = {'vocals', 'drums', 'bass', 'other'}

    def __init__(self, model_name: str = 'htdemucs', device: str = 'cuda', shifts: Optional[int] = 0, 
                 two_stems: Optional[str] = None, output_folder: str = 'output_directory', 
                 audio_files: Optional[List[str]] = None):
        self.model_name = model_name
        self.device = device
        self.shifts = shifts
        self.two_stems = two_stems
        self.output_folder = os.path.abspath(output_folder)
        self.audio_files = audio_files if audio_files else []
        
        self.validate_parameters()

    def validate_parameters(self):
        if self.model_name not in self.VALID_MODELS:
            raise ValueError(f"Invalid model_name: {self.model_name}. Valid options are: {self.VALID_MODELS}")
        
        if self.device not in self.VALID_DEVICES:
            raise ValueError(f"Invalid device: {self.device}. Valid options are: {self.VALID_DEVICES}")
        
        if self.two_stems and self.two_stems not in self.VALID_STEMS:
            raise ValueError(f"Invalid two_stems: {self.two_stems}. Valid options are: {self.VALID_STEMS}")
        
        if self.shifts is not None and (not isinstance(self.shifts, int) or self.shifts < 0):
            raise ValueError(f"Invalid shifts: {self.shifts}. Must be a non-negative integer or None.")

    def add_audio_file(self, file_path: str):
        if os.path.exists(file_path):
            self.audio_files.append(os.path.abspath(file_path))
        else:
            raise FileNotFoundError(f"Audio file not found: {file_path}")

    def separate(self):
        if not self.audio_files:
            raise ValueError("No audio files to process.")
        
        run_folder = os.path.join(self.output_folder, str(uuid.uuid4()))
        os.makedirs(run_folder, exist_ok=True)

        demucs_command = [
            'demucs',
            '-n', self.model_name,
            '-d', self.device,
            '-o', run_folder,
            '-j', '4',
            *self.audio_files
        ]

        if self.two_stems is not None:
            demucs_command.extend(['--two-stems', self.two_stems])
        
        if self.shifts is not None:
            demucs_command.extend(['--shifts', str(self.shifts)])
        
        try:
            subprocess.run(demucs_command, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error running Demucs: {e}")

        return run_folder


class Isolator:
    """
    Class to handle the conversion of audio files and initiate the Demucs separation process.
    """
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.audio_file = self.convert_to_wav(file_path)
        if self.audio_file:
            self.y, self.sr = librosa.load(self.audio_file, sr=None)

    def convert_to_wav(self, file_path: str) -> str:
        """
        Convert an MP3 file to WAV format.

        Args:
            file_path (str): Path to the MP3 file.

        Returns:
            str: Path to the converted WAV file.

        Raises:
            subprocess.CalledProcessError: If the conversion fails.
        """
        ffmpeg_path = os.path.join(os.path.dirname(__file__), 'ffmpeg.exe')
        if file_path.endswith('.mp3'):
            wav_path = file_path.replace('.mp3', '.wav')
            command = [ffmpeg_path, '-i', file_path, wav_path, '-y']
            try:
                subprocess.run(command, check=True)
                return wav_path
            except subprocess.CalledProcessError as e:
                print(f"Error converting file: {e}")
                return None
        return file_path

    def process_audio(self, model_name: str = 'htdemucs', device: str = 'cuda', shifts: Optional[int] = 0, 
                      two_stems: Optional[str] = None, output_folder: str = 'output_directory'):
        demucs_helper = DemucsHelper(model_name, device, shifts, two_stems, output_folder)
        demucs_helper.add_audio_file(self.audio_file)
        run_folder = demucs_helper.separate()

        output_files = []
        for root, _, files in os.walk(run_folder):
            for file in files:
                output_files.append(os.path.join(root, file))
        print(len(output_files))
        print(f"Output files: {output_files}")
        return output_files


def main():
    file_path = r"c:\Users\tjerf\Downloads\videoplayback - Copy.mp4"
    processor = Isolator(file_path)
    if processor.audio_file:
        processor.process_audio(output_folder=r"c:\Users\tjerf\Downloads\output")

        wav_file_path = file_path.replace('.mp3', '.wav')
        if os.path.exists(wav_file_path):
            os.remove(wav_file_path)


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
