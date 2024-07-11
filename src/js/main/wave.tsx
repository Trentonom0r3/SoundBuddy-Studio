import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { IconButton, Slider } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

const AudioPlayer: React.FC = () => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const waveSurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    if (waveformRef.current) {
      waveSurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#ddd',
        progressColor: '#ff5500',
        height: 100,

      });

      waveSurfer.current.load('path/to/your/audio/file.mp3');

      waveSurfer.current.on('ready', () => {
        waveSurfer.current?.setVolume(volume);
      });

      waveSurfer.current.on('play', () => setIsPlaying(true));
      waveSurfer.current.on('pause', () => setIsPlaying(false));
      waveSurfer.current.on('finish', () => setIsPlaying(false));

      return () => waveSurfer.current?.destroy();
    }
  }, [volume]);

  const togglePlayPause = () => {
    waveSurfer.current?.isPlaying() ? waveSurfer.current.pause() : waveSurfer.current?.play();
  };

  const stopAudio = () => {
    waveSurfer.current?.stop();
  };

  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    setVolume(newValue as number);
    waveSurfer.current?.setVolume(newValue as number);
  };

  const handleZoomIn = () => {
    const newZoom = zoom + 20;
    setZoom(newZoom);
    waveSurfer.current?.zoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = zoom > 20 ? zoom - 20 : 0;
    setZoom(newZoom);
    waveSurfer.current?.zoom(newZoom);
  };

  return (
    <div>
      <div ref={waveformRef} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <IconButton onClick={togglePlayPause}>
          {isPlaying ? <StopIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton onClick={stopAudio}>
          <StopIcon />
        </IconButton>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <VolumeUpIcon />
          <Slider value={volume} onChange={handleVolumeChange} min={0} max={1} step={0.01} style={{ width: '100px' }} />
        </div>
        <IconButton onClick={handleZoomIn}>
          <ZoomInIcon />
        </IconButton>
        <IconButton onClick={handleZoomOut}>
          <ZoomOutIcon />
        </IconButton>
      </div>
    </div>
  );
};

export default AudioPlayer;
