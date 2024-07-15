import logging
import subprocess
import sys

# Setup logging
logging.basicConfig(filename='initialize.log', level=logging.DEBUG, format='%(asctime)s %(levelname)s:%(message)s')

def check_installed_packages():
    try:
        import flask
        import librosa
        import scipy
        try:
            import demucs
            logging.info("demucs is already installed.")
        except ImportError:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-U', 'git+https://github.com/facebookresearch/demucs#egg=demucs'])
            # pip install -U 'git+https://github.com/facebookresearch/demucs#egg=demucs' 
            logging.info("demucs installed successfully.")
        logging.info("All required packages are already installed.")
        return True
    except ImportError as e:
        logging.error(f"Missing required package: {e}")
        return False

if __name__ == '__main__':
    if check_installed_packages():
        logging.info("Starting server...")
        from Server import app  # Ensure this import is done after installations
        app.run(debug=True)
    else:
        logging.error("Required packages are missing. Please check the installation.")
