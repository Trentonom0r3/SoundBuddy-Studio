import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { fs } from '../lib/cep/node';
import { evalTS } from '../lib/utils/bolt';
import { ActionButton, Slider } from '@adobe/react-spectrum';
import PlayIcon from '@spectrum-icons/workflow/Play';
import PauseIcon from '@spectrum-icons/workflow/Pause';
import VolumeMute from '@spectrum-icons/workflow/VolumeMute';
import VolumeOne from '@spectrum-icons/workflow/VolumeOne';
import VolumeTwo from '@spectrum-icons/workflow/VolumeTwo';
import VolumeThree from '@spectrum-icons/workflow/VolumeThree';
import './waveform.css';

interface AudioWaveformProps {
  waveSurfer: WaveSurfer | null;
  setWaveSurfer: React.Dispatch<React.SetStateAction<WaveSurfer | null>>;
  isFileLoaded: boolean;
  setIsFileLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  filePath: string | null;
  setFilePath: React.Dispatch<React.SetStateAction<string | null>>;
  handleFileChange: (file: File) => void;
  markers: any[];
  setMarkers: React.Dispatch<React.SetStateAction<any[]>>;
}

const AudioWaveform = forwardRef(({
  waveSurfer,
  setWaveSurfer,
  isFileLoaded,
  setIsFileLoaded,
  filePath,
  setFilePath,
  handleFileChange,
  markers,
  setMarkers,
}: AudioWaveformProps, ref) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [fileName, setFileName] = useState<string | null>(null);
  const [regionsPlugin, setRegionsPlugin] = useState<RegionsPlugin | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [inpoint, setInPoint] = useState(0);

  const random = (min: number, max: number) => Math.random() * (max - min) + min;
  const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map((v) => (v < 10 ? '0' + v : v))
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  };

  useEffect(() => {
    if (waveSurfer) {
      waveSurfer.destroy();
    }

    const ws = WaveSurfer.create({
      container: waveformRef.current!,
      waveColor: '#D9DCFF',
      progressColor: '#4353FF',
      cursorColor: '#4353FF',
      barWidth: 2,
      barRadius: 2,
      normalize: true,
      dragToSeek: true,
      interact: true,
      autoCenter: true,
      autoScroll: true,
      hideScrollbar: true,
      fillParent: true,
      backend: 'MediaElement',  // Set the backend to MediaElement
      plugins: [
        ZoomPlugin.create({
          scale: 1.1,
          maxZoom: 1000,
        }),
        MinimapPlugin.create({
          height: 30,
          waveColor: '#D9DCFF',
          progressColor: '#4353FF',
          cursorColor: '#4353FF',
          insertPosition: 'afterend',
        }),
      
        RegionsPlugin.create(),
      ],
    });

    ws.on('ready', () => {
      setWaveSurfer(ws);
      const plugins = ws.getActivePlugins();
      for (let i = 0; i < plugins.length; i++) {
        if (plugins[i] instanceof RegionsPlugin) {
          setRegionsPlugin(plugins[i] as RegionsPlugin);
          break;
        }
      }
    });

    ws.on('audioprocess', () => {
      const currentTime = ws.getCurrentTime();
      setCurrentTime(formatTime(currentTime));
    });

    ws.on('timeupdate', () => {
      const currentTime = ws.getCurrentTime();
      evalTS('setPlayerPos', currentTime);
      setCurrentTime(formatTime(currentTime));
    });

    ws.on('error', (error) => {
      console.error('WaveSurfer error:', error);
    });

    ws.on('play', () => {
      setIsPlaying(true);
      console.log('Playing audio');
    });

    ws.on('pause', () => {
      setIsPlaying(false);
      console.log('Pausing audio');
    });

    setWaveSurfer(ws);

    return () => {
      ws.destroy();
    };
  }, [setWaveSurfer]);

  useEffect(() => {
    if (filePath && waveSurfer) {
      waveSurfer.load(filePath);
      setIsFileLoaded(true);
    }
  }, [filePath, waveSurfer, setIsFileLoaded]);

  useEffect(() => {
    if (regionsPlugin && markers.length > 0) {
      markers.forEach((marker) => {
        if (!regionsPlugin.getRegions().find(region => region.id === marker.id)) {
          const content = document.createElement('div');
          content.className = 'timecode';
          content.textContent = marker.start.toFixed(2).toString();
          content.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          content.style.padding = '1px 5px';
          content.style.borderRadius = '1px';
          content.style.zIndex = '9999';
          content.style.position = 'absolute';
          content.style.top = '1px';
          content.style.left = '1px';
          content.style.display = 'flex';
          content.style.gap = '1px';

          regionsPlugin.addRegion({
            id: marker.id,
            start: marker.start,
            content: content,
            color: marker.color,
          });
        }
      });
    }
  }, [regionsPlugin, markers]);

  useEffect(() => {
    const handleSpacebar = (event: KeyboardEvent) => {
      if (event.code === 'Space' && document.activeElement === document.body) {
        event.preventDefault();
        waveSurfer?.playPause();
      }
    };

    window.addEventListener('keydown', handleSpacebar);
    return () => {
      window.removeEventListener('keydown', handleSpacebar);
    };
  }, [waveSurfer]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileChange(file);
      setFileName(file.name); // Update fileName when a new file is selected
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
      setFileName(file.name); // Update fileName when a file is dropped
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddMarker = (time: number) => {
    if (regionsPlugin && waveSurfer) {
      let currentTime = waveSurfer.getCurrentTime();
      if (time) {
        currentTime = time;
      }
      if (!markers.some(marker => Math.abs(marker.start - currentTime) < 0.1)) {
        const newMarker = {
          id: Date.now().toString(),
          start: currentTime,
          color: randomColor(),
        };
        const content = document.createElement('div');
        content.className = 'timecode';
        content.textContent = currentTime.toFixed(2).toString();
        content.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        content.style.padding = '1px 5px';
        content.style.borderRadius = '1px';
        content.style.zIndex = '9999';
        content.style.position = 'absolute';

        regionsPlugin.addRegion({
          id: newMarker.id,
          start: newMarker.start,
          content: content,
          color: newMarker.color,
        });
        setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
      }
    }
  };

  const handleClearMarkers = () => {
    if (regionsPlugin) {
      const regions = regionsPlugin.getRegions();
      //for each region, call region.remove()
      regions.forEach(region => {
        region.remove();
      });
      setMarkers([]);
    }
  };
  

  const handleRemoveWaveform = () => {
    setIsFileLoaded(false);
    setFilePath(null);
    setFileName(null); // Reset fileName when waveform is removed
    if (waveSurfer) {
      waveSurfer.stop();
      waveSurfer.empty();
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    waveSurfer?.setVolume(newVolume);
  };

  const handleVolumeClick = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    if (newMuteState) {
      waveSurfer?.setVolume(0);
    } else {
      waveSurfer?.setVolume(volume);
    }
  };

  useImperativeHandle(ref, () => ({
    addMarker: handleAddMarker,
    clearMarkers: handleClearMarkers,
  }));

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeMute />;
    if (volume <= 0.3) return <VolumeOne />;
    if (volume <= 0.6) return <VolumeTwo />;
    return <VolumeThree />;
  };

  const togglePlayPause = () => {
    waveSurfer?.playPause();
  };

  const handleWaveformClick = async () => {
    if (!isFileLoaded) {
      const info = await evalTS('getAudioInfo');
      const { path: audioPath, name: audioName, inPoint: inpoint } = info || {};
      if (audioPath) {
        try {
          const fileBuffer = fs.readFileSync(audioPath);
          const blob = new Blob([fileBuffer], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          setFilePath(url);
          setFileName(audioName); // Set the file name
          setIsFileLoaded(true);
          setInPoint(inpoint);
          if (waveSurfer) {
            waveSurfer.load(url);
          }
        } catch (error) {
          console.error('Error loading audio file:', error);
        }
      }
    }
  };

  return (
    <div className="audio-waveform">
      <div
        style={{ display: 'flex' }}
        className={`waveform-container`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleWaveformClick}
      >
        {!isFileLoaded && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />
            <p>Drag and drop an audio file here, or click to select a file.</p>
          </>
        )}

        {isFileLoaded && (
          <div className="overlay-controls">
            <div className="timecode">{currentTime}</div>
            <ActionButton 
              onPress={togglePlayPause} 
              UNSAFE_className={`play-pause-button ${isPlaying ? 'playing' : 'paused'}`}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </ActionButton>
            <div className="volume-container">
              <ActionButton onPress={handleVolumeClick} UNSAFE_className="volume-button">
                {getVolumeIcon()}
              </ActionButton>
              <Slider
                value={volume}
                onChange={handleVolumeChange}
                minValue={0}
                maxValue={1}
                step={0.01}
                aria-label="Volume"
                UNSAFE_className="volume-slider"
              />
            </div>
            {fileName && <div className="file-name">{fileName}</div>}
            <button className="close-button" onClick={handleRemoveWaveform}>x</button>
          </div>
        )}
        <div ref={waveformRef} className="waveform"></div>
        {isFileLoaded && (
          <>
            <div ref={minimapRef} className="waveform-minimap"></div>
          </>
        )}
      </div>
    </div>
  );
});

export default AudioWaveform;
