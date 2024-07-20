#!/bin/bash
source venv/bin/activate
pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2
pip install -r requirements.txt
python3 app/initialize.py
