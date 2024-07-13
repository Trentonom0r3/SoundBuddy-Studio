import React, { useState, useRef, useEffect } from "react";
import './styles.css';
import {
  defaultTheme, Item, Key, Picker, Provider, ActionButton, ActionMenu, Flex, Slider,
  Divider,
  Heading
} from '@adobe/react-spectrum';
import { FlaskClient, createIsolationRequest, createBeatDetectionRequest } from './server';
import { evalTS } from "../lib/utils/bolt";
import AudioWaveform from "./waveform";
import WaveSurfer from 'wavesurfer.js';
import { fs, os, path } from "../lib/cep/node";
import { join } from "path";
import { clear } from "console";
import audioBanner from './audiobanner.png';
import beatBanner from './beatbanner.png';
import mainBanner from './soundbuddybanner.png';

interface IsolationPaths {
  vocals: string;
  drums: string;
  bass: string;
  other: string;
  original: string;
}

const Main = () => {
  const [isolateOptions, setIsolateOptions] = useState<Key>('original');
  const [selectedPage, setSelectedPage] = useState<Key>('waveform');
  const [model, setModel] = useState<Key>('htdemucs');
  const [device, setDevice] = useState<Key>('cuda');
  const [shifts, setShifts] = useState<number>(0);
  const [hopLength, setHopLength] = useState<number>(512);
  const [tightness, setTightness] = useState<number>(100);
  const [startBPM, setStartBPM] = useState<number>(120);
  const [overlap, setOverlap] = useState<number>(0.5);
  const [isolationPaths, setIsolationPaths] = useState<IsolationPaths | null>(null);

  const flaskClient = new FlaskClient('http://localhost:5000');

  const [waveSurfer, setWaveSurfer] = useState<WaveSurfer | null>(null);
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);

  const waveformRef = useRef<any>(null); // Ref for AudioWaveform component

  useEffect(() => {
    if (waveSurfer && filePath) {
      console.log('Loading path:', filePath);
      waveSurfer.load(filePath);
    }
  }, [filePath, waveSurfer]);

  const saveBase64ToFile = (base64Data: string, filename: string) => {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = join(os.tmpdir(), filename);
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved file to ${filePath}`);
      const fileExists = fs.existsSync(filePath);
      console.log(`File exists after save: ${fileExists}`);
      if (!fileExists) {
        throw new Error('File was not saved correctly.');
      }
      return filePath;
    } catch (error) {
      console.error(`Error saving file: ${error}`);
      throw error;
    }
  };

  const saveBlobToFile = async (blobUrl: string, filename: string) => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filePath = join(os.tmpdir(), filename);
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved blob file to ${filePath}`);
      const fileExists = fs.existsSync(filePath);
      console.log(`File exists after save: ${fileExists}`);
      if (!fileExists) {
        throw new Error('Blob file was not saved correctly.');
      }
      return filePath;
    } catch (error) {
      console.error(`Error saving blob file: ${error}`);
      throw error;
    }
  };

  const createOutputPath = (inputFile: string, name: string, path: string) => {
    const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
    const outputFolder = path.substring(0, index);
    return `${outputFolder}/${name}_isolated`;
  };

  const handleFilePath = async (audioPath: string) => {
    const name = path.basename(audioPath) + '.wav';
    if (audioPath.startsWith('data:audio')) {
      const base64String = audioPath.split(',')[1];
      return saveBase64ToFile(base64String, name);
    }

    if (audioPath.startsWith('blob:file:///')) {
      const blobUrl = audioPath;
      audioPath = await saveBlobToFile(blobUrl, name);
      console.log(`Converted and saved blob URL to file path: ${audioPath}`);
    }

    if (!path.isAbsolute(audioPath)) {
      audioPath = join(os.tmpdir(), name);
      console.log(`Converted relative path to absolute path: ${audioPath}`);
    }

    return audioPath;
  };

  const isolate = async () => {
    try {
      let audioPath = filePath;
      if (!audioPath) {
        const info = await evalTS('getAudioInfo');
        const { path } = info || {};
        audioPath = path;
      }

      console.log('Audio path before handling:', audioPath);
      audioPath = await handleFilePath(audioPath || '');

      // Log the final audio path
      console.log('Final audio path:', audioPath);
      console.log(`File exists before request: ${fs.existsSync(audioPath)}`);

      // Ensure the file is actually there before proceeding
      if (!fs.existsSync(audioPath)) {
        throw new Error(`File does not exist at path: ${audioPath}`);
      }

      const outpath = createOutputPath(audioPath || '', "isolated", audioPath || '');
      const args = createIsolationRequest(audioPath || '', model.toString(), device.toString(), shifts, null, outpath);

      // Log the request data
      console.log('Isolation request data:', JSON.stringify(args));

      const outputFiles = await flaskClient.isolateAudio(args);

      if (outputFiles && outputFiles.length > 0) {
        console.log('Isolation complete. Output files:', outputFiles);

        const createBlobURL = (filePath: string): string => {
          const fileBuffer: Buffer = fs.readFileSync(filePath);
          const blob: Blob = new Blob([fileBuffer], { type: 'audio/wav' });
          return URL.createObjectURL(blob);
        };
        

        let isolationPaths2 = {
          vocals: createBlobURL(outputFiles.find(file => file.includes('vocals.wav')) ?? ''),
          drums: createBlobURL(outputFiles.find(file => file.includes('drums.wav')) ?? ''),
          bass: createBlobURL(outputFiles.find(file => file.includes('bass.wav')) ?? ''),
          other: createBlobURL(outputFiles.find(file => file.includes('other.wav')) ?? ''),
          original: createBlobURL(audioPath || ''),
        };

        setIsolationPaths(isolationPaths2);
      } else {
        console.error('No output files returned from the server.');
      }
    } catch (error) {
      console.error('Error isolating audio:', error);
      alert("Error isolating audio: " + (error as Error).message);
    }
  };

  const detect_beats = async () => {
    try {
      let audioPath = filePath;
      if (!audioPath) {
        const info = await evalTS('getAudioInfo');
        const { path } = info || {};
        audioPath = path;
      }

      console.log('Audio path before handling:', audioPath);
      audioPath = await handleFilePath(audioPath || '');

      // Log the final audio path
      console.log('Final audio path:', audioPath);
      console.log(`File exists before request: ${fs.existsSync(audioPath)}`);

      // Ensure the file is actually there before proceeding
      if (!fs.existsSync(audioPath)) {
        throw new Error(`File does not exist at path: ${audioPath}`);
      }

      const outpath = createOutputPath(audioPath || '', "beats", audioPath || '');
      const beatArgs = createBeatDetectionRequest(audioPath || '', outpath, hopLength, 44100, startBPM, tightness);

      const beatResults = await flaskClient.detectBeats(beatArgs);

      if (beatResults && beatResults.length > 0) {
        console.log('Beat detection complete. Results:', JSON.stringify(beatResults));

        beatResults.forEach((result: { beat_times: any; }) => {
          const { beat_times } = result;
          beat_times.forEach((time: number) => {
            console.log('Beat time:', time);
            addMarker(time);
          });
        });
      } else {
        console.error('No beat detection results returned from the server.');
      }
    } catch (error) {
      console.error('Error detecting beats:', error);
    }
  };

  
  const resetSlider = (setter: React.Dispatch<number>, defaultValue: number) => {
    setter(defaultValue);
  };

  const renderSliderWithReset = (label: string, value: number, onChange: (value: number) => void, minValue: number, maxValue: number, step: number, defaultValue: number) => (
    <Flex alignItems="center" gap="size-100" width="100%">
      <div onDoubleClick={() => resetSlider(onChange, defaultValue)} style={{ width: '100%' }}>
        <Slider UNSAFE_className='custom-slider' label={label} value={value} onChange={onChange} minValue={minValue} maxValue={maxValue} step={step} width="100%" />
      </div>
    </Flex>
  );

  const applyMarkers = async (markers: any) => {  
    const ans = await evalTS('applyMarkers', markers);
    return ans;
  }
  

  const handleMenuAction = (key: Key) => {
    switch (key) {
      case 'waveform':
        setSelectedPage(key);
        break;
      case 'isolation':
        setSelectedPage(key);
        break;
      case 'beatDetection':
        setSelectedPage(key);
        break;
      case 'sync':
        syncToPlayerTime();
        break;
      case 'clear':
        clearMarkers();
        break;
      case 'addToSequence':
        if (markers.length === 0) {
          alert('No markers to add to sequence.');
          return;
        }
        const ret = applyMarkers(markers);
        ret.catch((e: any) => {
          alert('Error applying markers to sequence:' + e);
        }
        );
        break;
      case 'addToClip':
        if (markers.length === 0) {
          alert('No markers to add to sequence.');
          return;
        }
        const ret2 = addMarkersToTrack(markers);
        ret2.catch((e: any) => {
          alert('Error applying markers to sequence:' + e);
        }
        );
        break;
      default:
        console.error('Invalid menu action key:', key);
    }
  };

  const handleFileChange = (file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFilePath(result);
        setIsFileLoaded(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const addMarker = (time: number) => {
    if (waveformRef.current) {
      waveformRef.current.addMarker(time);
    }
  };

  const clearMarkers = () => {
    evalTS('deleteMarkers');
    evalTS('deleteAllMarkersFromTrack');
    if (waveformRef.current) {
      waveformRef.current.clearMarkers(); // Call the clearMarkers method from the ref

    }
  };

  const addMarkersToTrack = async (markers: any) => {
    const ans = await evalTS('addMarkerstoTrack', markers);
    return ans;
  }
  
  const syncToPlayerTime = async () => {
    const time = await evalTS('getPlayerPos');
    const info = await evalTS('getAudioInfo');
    const inpoint = info?.inPoint;
    //update wavesurfer time
    if (waveSurfer) {
      waveSurfer.seekTo((time - inpoint) / waveSurfer.getDuration());
    }
  }

  const getDisabledKeys = (): Key[] => {
    const disabledKeys: Key[] = [];
    if (!isolationPaths?.vocals) disabledKeys.push('vocals');
    if (!isolationPaths?.drums) disabledKeys.push('drums');
    if (!isolationPaths?.bass) disabledKeys.push('bass');
    if (!isolationPaths?.other) disabledKeys.push('other');
    return disabledKeys;
  };

  const importActiveAudio = async () => {
    try {
      const rand_num = Math.floor(Math.random() * 1000);
      let path = '';
      switch (isolateOptions) {
        case 'vocals':
          path = await saveBlobToFile(isolationPaths?.vocals || '', `vocals_${rand_num}.wav`);
          console.log('Saved file:', path);
          break; // Added break statement
        case 'drums':
          path = await saveBlobToFile(isolationPaths?.drums || '', `drums_${rand_num}.wav`);
          console.log('Saved file:', path);
          break; // Added break statement
        case 'bass':
          path = await saveBlobToFile(isolationPaths?.bass || '', `bass_${rand_num}.wav`);
          console.log('Saved file:', path);
          break; // Added break statement
        case 'other':
          path = await saveBlobToFile(isolationPaths?.other || '', `other_${rand_num}.wav`);
          console.log('Saved file:', path);
          break; // Added break statement
        case 'original':
          await evalTS('sendESAlert', 'Original audio already exists in the project.');
          break; // Added break statement
        default:
          console.error('Unknown isolation option selected.');
      }
      if (path !== '') {
        await evalTS('importFile', path);
      }
    } catch (error: any) {
      console.error('Error testing:', error);
    }
  };
  

  const handleSelectionChange = (key: Key) => {
    setIsolateOptions(key);
    if (key === 'original' || (isolationPaths && isolationPaths[key as keyof IsolationPaths])) {
      if (isolationPaths) {
        const path = isolationPaths[key as keyof IsolationPaths];
        setFilePath(path);
      }
    } else {
      console.error('Isolation path not available.');
    }
  };

  return (
    <Provider theme={defaultTheme}>
      <Flex direction="column" marginBottom="size-200" gap="size-100" margin="size-100">
        <Flex alignItems="center" direction="row" gap="size-100" margin="size-100" width="100%">
          <ActionMenu onAction={handleMenuAction} width="size-100" UNSAFE_className="custom-action-menu">
            <Item key="waveform">Waveform</Item>
            <Item key="isolation">Isolation Settings</Item>
            <Item key="beatDetection">Beat Detection</Item>
            <Item key="sync">Sync to Player Time</Item>
            <Item key="clear">Clear Markers</Item>
            <Item key="addToSequence">Add Markers to Sequence</Item>
            <Item key="addToClip">Add Markers to Clip</Item>
          </ActionMenu>
          <Picker aria-label="Isolation Options" selectedKey={isolateOptions} onSelectionChange={handleSelectionChange} width="25%" disabledKeys={getDisabledKeys()} UNSAFE_className="custom-picker">
            <Item key="original">Original</Item>
            <Item key="vocals">Vocals Only</Item>
            <Item key="drums">Drums Only</Item>
            <Item key="bass">Bass Only</Item>
            <Item key="other">Other Only</Item>
          </Picker>
          <ActionButton onPress={isolate} UNSAFE_className="custom-action-button">
            Isolate
          </ActionButton>
          <ActionButton onPress={detect_beats} UNSAFE_className="custom-action-button">
            Detect Beats
          </ActionButton>
          <ActionButton onPress={importActiveAudio} UNSAFE_className="custom-action-button">Add To Project</ActionButton>
        </Flex>
        <div>
          {selectedPage === 'waveform' && (
            <div>
              <Flex direction="column" width="100%" alignItems="center">
                <img src={mainBanner} alt="Isolation Settings Banner" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px' }} />
              </Flex>
              <AudioWaveform
                ref={waveformRef}
                waveSurfer={waveSurfer}
                setWaveSurfer={setWaveSurfer}
                isFileLoaded={isFileLoaded}
                setIsFileLoaded={setIsFileLoaded}
                filePath={filePath}
                setFilePath={setFilePath}
                handleFileChange={handleFileChange}
                markers={markers}
                setMarkers={setMarkers}
              />
            </div>
          )}
          {selectedPage === 'isolation' && (
            <Flex direction="column" width="100%" alignItems="center">
              <img src={audioBanner} alt="Isolation Settings Banner" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px' }} />
              <Flex direction="row" alignItems="center" justifyContent="space-between" gap="size-100" margin="size-100" width="95%">
                <Picker label="Model" selectedKey={model} onSelectionChange={setModel} width="50%" UNSAFE_className="custom-picker">
                  <Item key="htdemucs">htdemucs</Item>
                  <Item key="htdemucs_ft">htdemucs_ft</Item>
                  <Item key="htdemucs_6s">htdemucs_6s</Item>
                  <Item key="hdemucs_mmi">hdemucs_mmi</Item>
                  <Item key="mdx">mdx</Item>
                  <Item key="mdx_extra">mdx_extra</Item>
                  <Item key="mdx_q">mdx_q</Item>
                  <Item key="mdx_extra_q">mdx_extra_q</Item>
                </Picker>
                <Picker label="Device" selectedKey={device} onSelectionChange={setDevice} width="50%" UNSAFE_className="custom-picker">
                  <Item key="cpu">cpu</Item>
                  <Item key="cuda">cuda</Item>
                </Picker>
              </Flex>
              <Flex direction="row" alignItems="center" justifyContent="space-between" gap="size-100" margin="size-100" width="95%">
                {renderSliderWithReset('Shifts', shifts, setShifts, 0, 10, 1, 0)}
                {renderSliderWithReset('Overlap', overlap, setOverlap, 0, 1, 0.01, 0.5)}
              </Flex>
            </Flex>
          )}
          {selectedPage === 'beatDetection' && (
            <Flex direction="column" width="100%" alignItems="center">
              <img src={beatBanner} alt="Beat Detection Settings Banner" style={{ marginBottom: '20px', width: '100%', maxWidth: '800px' }} />
              <Flex direction="row" alignItems="center" justifyContent="space-between" gap="size-100" margin="size-100" width="95%">
                {renderSliderWithReset('Start BPM', startBPM, setStartBPM, 60, 180, 1, 120)}
                {renderSliderWithReset('Hop Length', hopLength, setHopLength, 256, 1024, 64, 512)}
                {renderSliderWithReset('Tightness', tightness, setTightness, 0, 100, 1, 100)}
              </Flex>
            </Flex>
          )}
        </div>
      </Flex>
    </Provider>
  );
};

export default Main;
