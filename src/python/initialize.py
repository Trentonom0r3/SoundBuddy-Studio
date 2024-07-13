#script to install required packages

import os
import subprocess
import sys
import platform

def install_reqs():
    #install requirements.txt
    try:
        req_file = os.path.join(os.path.dirname(__file__), 'requirements.txt')
        # Update pip to the latest version
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--upgrade', 'pip'])
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', req_file])
    except subprocess.CalledProcessError as e:
        print(f"Error installing packages: {e}")
        sys.exit(1)
        

def install_packages():
    """Install additional packages like demucs and ffmpeg."""
    try:
        install_reqs()
        # Install demucs
        try:
            import demucs
            print("demucs is already installed.")
        except ImportError:
            # Install demucs from GitHub
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-U', 'git+https://github.com/facebookresearch/demucs#egg=demucs'])
            print("demucs installed successfully.")

        # Check if ffmpeg is installed
        ffmpeg_installed = False
        try:
            result = subprocess.run(['ffmpeg', '-version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if result.returncode == 0:
                print("ffmpeg is already installed.")
                ffmpeg_installed = True
        except FileNotFoundError:
            pass

        if not ffmpeg_installed:
            print("ffmpeg not found, installing...")
            os_type = platform.system()
            if os_type == 'Windows':
                # Download and install ffmpeg for Windows
                ffmpeg_url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
                subprocess.check_call(['curl', '-L', ffmpeg_url, '-o', 'ffmpeg.zip'])
                subprocess.check_call(['tar', '-xf', 'ffmpeg.zip', '-C', 'ffmpeg'])
                os.remove('ffmpeg.zip')
                print("ffmpeg installed successfully.")
            elif os_type == 'Linux' or os_type == 'Darwin':
                # Use package manager for Linux or macOS
                subprocess.check_call(['sudo', 'apt-get', 'install', '-y', 'ffmpeg'])
                print("ffmpeg installed successfully.")

    except subprocess.CalledProcessError as e:
        print(f"Error installing packages: {e}")
        sys.exit(1)