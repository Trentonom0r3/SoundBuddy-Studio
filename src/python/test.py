import librosa
import numpy as np
from scipy.spatial.distance import cosine
from pydub import AudioSegment
from pydub.playback import play

def extract_audio_features(audio_path):
    y, sr = librosa.load(audio_path)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
    onsets = librosa.onset.onset_detect(y=y, sr=sr)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
    times = librosa.times_like(onsets, sr=sr)
    
    return {
        'tempo': tempo,
        'beats': beats,
        'onsets': onsets,
        'mfcc': mfcc,
        'spectral_contrast': spectral_contrast,
        'times': times,
        'path': audio_path
    }

def create_audio_snippets(features, snippet_length=1.0, sr=22050):
    snippets = []
    y, sr = librosa.load(features['path'])
    
    for onset in features['onsets']:
        start_sample = int(onset * sr)
        end_sample = start_sample + int(snippet_length * sr)
        snippet = y[start_sample:end_sample]
        snippets.append({
            'onset': onset,
            'snippet': snippet,
            'sr': sr
        })
    
    return snippets

def pad_or_truncate(array, target_length):
    if array.shape[1] > target_length:
        return array[:, :target_length]
    elif array.shape[1] < target_length:
        return np.pad(array, ((0, 0), (0, target_length - array.shape[1])), mode='constant')
    else:
        return array

def find_matches(video_snippets, music_snippets, threshold=0.1, target_length=40):
    matches = []
    
    for v_snippet in video_snippets:
        for m_snippet in music_snippets:
            v_mfcc = librosa.feature.mfcc(y=v_snippet['snippet'], sr=v_snippet['sr'], n_mfcc=13)
            m_mfcc = librosa.feature.mfcc(y=m_snippet['snippet'], sr=m_snippet['sr'], n_mfcc=13)
            
            v_mfcc = pad_or_truncate(v_mfcc, target_length)
            m_mfcc = pad_or_truncate(m_mfcc, target_length)
            
            similarity = cosine(v_mfcc.flatten(), m_mfcc.flatten())
            
            if similarity < threshold:
                matches.append((v_snippet, m_snippet))
    
    return matches

def return_matches(matches):
    match_info = []
    for match in matches:
        v_snippet, m_snippet = match
        match_info.append({
            'video_time': v_snippet['onset'],
            'music_time': m_snippet['onset'],
            'video_snippet': v_snippet['snippet'],
            'music_snippet': m_snippet['snippet'],
            'video_sr': v_snippet['sr'],
            'music_sr': m_snippet['sr']
        })
    return match_info

def play_snippet(snippet, sr):
    audio = AudioSegment(
        snippet.tobytes(), 
        frame_rate=sr,
        sample_width=snippet.dtype.itemsize, 
        channels=1
    )
    play(audio)

def play_matched_snippets(match_info):
    for match in match_info:
        print(f"Playing video snippet at {match['video_time']} and music snippet at {match['music_time']}")
        print("Playing video snippet...")
        play_snippet(match['video_snippet'], match['video_sr'])
        print("Playing music snippet...")
        play_snippet(match['music_snippet'], match['music_sr'])
        combined_snippet = np.concatenate((match['video_snippet'], match['music_snippet']))
        combined_sr = min(match['video_sr'], match['music_sr'])
        print("Playing combined snippet...")
        play_snippet(combined_snippet, combined_sr)

if __name__ == '__main__':
    import cProfile
    import pstats
    
    # Example Usage
    def main():
        video_audio_features = extract_audio_features(r"C:\Users\tjerf\Downloads\rocky_audio.wav")
        music_audio_features = extract_audio_features(r"C:\Users\tjerf\Downloads\tiger.wav")
        video_snippets = create_audio_snippets(video_audio_features)
        music_snippets = create_audio_snippets(music_audio_features)
        matches = find_matches(video_snippets, music_snippets)
        match_info = return_matches(matches)
        print(match_info)
        play_matched_snippets(match_info)

    profiler = cProfile.Profile()
    profiler.enable()

    main()

    profiler.disable()
    with open("profile_output.txt", "w") as f:
        stats = pstats.Stats(profiler, stream=f)
        stats.sort_stats(pstats.SortKey.TIME)
        # Print top 25 functions
        stats.print_stats(25)