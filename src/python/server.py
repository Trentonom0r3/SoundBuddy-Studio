from flask import Flask, jsonify, request, Response
import time
import json
import Isolator
import BeatRec

app = Flask(__name__)
progress = 0

@app.route('/progress')
def progress_stream():
    def generate():
        global progress
        while progress < 100:
            time.sleep(0.1)
            yield f"data:{progress}\n\n"
        yield f"data:{progress}\n\n"
    return Response(generate(), mimetype='text/event-stream')

@app.route('/isolate', methods=['POST'])
def isolate():
    print("Isolating audio...")
    global progress
    progress = 0
    data = request.json
    print(data['file_path'])
    #wait for user to press enter
    
    try:
        isolator = Isolator.Isolator(data['file_path'])
        print("Isolator created.")
        model_name = data.get('model_name', 'htdemucs')
        device = data.get('device', 'cuda')
        shifts = data.get('shifts', 0)
        two_stems = data.get('two_stems', None)
        output_folder = data.get('output_folder', 'output')
        
        output_files = isolator.process_audio(model_name=model_name, device=device, shifts=shifts, two_stems=two_stems, output_folder=output_folder)
        progress = 100
        print("Isolation complete.")
        return jsonify({"message": "Isolation complete.", "output_files": output_files})
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@app.route('/beat-detection', methods=['POST'])
def beat_detection():
    print("Detecting beats...")
    global progress
    progress = 0
    data = request.json
    try:
        hop_length = data.get('hop_length', 512)
        sr = data.get('sr', 22050)
        start_bpm = data.get('start_bpm', 120)
        tightness = data.get('tightness', 100.0)
        beat_rec = BeatRec.BeatTracker(audio_files=[data['file_path']],
                                       hop_length=hop_length, 
                                       sr=sr, start_bpm=start_bpm,
                                       tightness=tightness)
        results = beat_rec.track_beats()
        progress = 100
        print("Beat detection completed.")
        return jsonify({"message": "Beat detection completed successfully.", "results": results})
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
