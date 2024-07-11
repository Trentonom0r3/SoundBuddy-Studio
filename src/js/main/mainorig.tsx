import React, { useState } from "react";
import './styles.css';
import { defaultTheme, Item, Key, Picker, Provider, ActionButton, TabList, TabPanels, Tabs, Slider, Tooltip, TooltipTrigger, Flex, Text, Divider, View, ActionGroup } from '@adobe/react-spectrum';
import CustomAccordion from './Accordion';
import { FlaskClient, createBeatDetectionRequest, createIsolationRequest } from './server';
import { evalTS } from "../lib/utils/bolt";

let audiopath = '';
let inpoint = 0;
let audioName = '';

const Main = () => {
  const [isolateOptions, setIsolateOptions] = useState<string>('vocals');
  const [selectedTab, setSelectedTab] = useState<Key>('tab1');
  const [model, setModel] = useState<string>('htdemucs');
  const [device, setDevice] = useState<string>('cuda');
  const [shifts, setShifts] = useState<number>(0);
  const [hopLength, setHopLength] = useState<number>(512);
  const [tightness, setTightness] = useState<number>(100);
  const [startBPM, setStartBPM] = useState<number>(120);

  const flaskClient = new FlaskClient('http://localhost:5000');
  
  const handleSelectionChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (key: Key) => {
    setter(key as string);
  };

  const createOutputPath = (input_file: string, name: string) => (path : string) => {
    var index = path.lastIndexOf("\\");
    if (index === -1) {
      index = path.lastIndexOf("/");
    }
    var output_folder = path.substring(0, index);
    return `${output_folder}\\${name}_isolated`;
  }

  const handleClick = async () => {
    var info = await evalTS('getAudioInfo');

    audiopath = info?.path;
    inpoint = info?.inPoint;
    audioName = info?.name;

    const outpath = createOutputPath(audiopath, audioName)(audiopath);
    const args = createIsolationRequest(audiopath, model, device, shifts, null, outpath);
    const data = await flaskClient.isolateAudio(args);
    if (data) {
      await evalTS('importFile', outpath, inpoint);
    }
  };

  const resetSlider = (setter: React.Dispatch<React.SetStateAction<number>>, defaultValue: number) => {
    setter(defaultValue);
  };

  return (
    <Provider theme={defaultTheme}>
      <div className="flex-container">
        <Tabs selectedKey={selectedTab} onSelectionChange={setSelectedTab} aria-label="Audio Options">
          <Flex direction="row" alignItems="center" justifyContent="space-between" width="100%">
            <TabList flex="1 1 auto" minWidth="0px">
              <Item key="tab1">Isolation</Item>
              <Item key="tab2">Beat Detection</Item>
              <Item key="tab3">Settings</Item>
            </TabList>
            <ActionGroup onAction={(action) => console.log(action)} flex="0 0 auto">
              <Item key="waveformEditor">Waveform Editor</Item>
            </ActionGroup>
          </Flex>
          <TabPanels>
            <Item key="tab1">
              <Flex direction="column" gap="size-200" width="100%">
                <Flex alignItems={'center'} justifyContent={'space-between'} gap="size-100" margin={"size-100"} width="100%">
                  <Picker aria-label="Isolation Options" selectedKey={isolateOptions} onSelectionChange={handleSelectionChange(setIsolateOptions)} width="50%">
                    <Item key="vocals">Vocals Only</Item>
                    <Item key="drums">Drums Only</Item>
                    <Item key="bass">Bass Only</Item>
                    <Item key="other">Other</Item>
                    <Item key="Isolate All">Isolate All</Item>
                  </Picker>
                  <ActionButton UNSAFE_className="flex-grow action-button">Waveform Editor</ActionButton>
                </Flex>
                <Flex justifyContent={'center'} margin={"size-100"} gap="size-100" width="100%">
                  <ActionButton UNSAFE_className="flex-grow action-button" onPress={handleClick}>Add to Project</ActionButton>
                </Flex>
                <Divider size="S" />
                <CustomAccordion title="Advanced Features">
                  <Flex direction="column" gap="size-150" width="100%">
                    <Picker label="Model" selectedKey={model} onSelectionChange={handleSelectionChange(setModel)} width="100%">
                      <Item key="htdemucs">htdemucs</Item>
                      <Item key="htdemucs_ft">htdemucs_ft</Item>
                      <Item key="htdemucs_6s">htdemucs_6s</Item>
                      <Item key="hdemucs_mmi">hdemucs_mmi</Item>
                      <Item key="mdx">mdx</Item>
                      <Item key="mdx_extra">mdx_extra</Item>
                      <Item key="mdx_q">mdx_q</Item>
                      <Item key="mdx_extra_q">mdx_extra_q</Item>
                    </Picker>
                    <Picker label="Device" selectedKey={device} onSelectionChange={handleSelectionChange(setDevice)} width="100%">
                      <Item key="cpu">cpu</Item>
                      <Item key="cuda">cuda</Item>
                    </Picker>
                    <Flex alignItems="center" gap="size-100" width="100%">
                      <Slider label="Shifts" value={shifts} onChange={setShifts} minValue={0} maxValue={10} width="70%" />
                      <TooltipTrigger>
                        <ActionButton onPress={() => resetSlider(setShifts, 0)} isQuiet>
                          <Text>Reset</Text>
                        </ActionButton>
                        <Tooltip>Reset to default</Tooltip>
                      </TooltipTrigger>
                    </Flex>
                  </Flex>
                </CustomAccordion>
              </Flex>
            </Item>
            <Item key="tab2">
              <div>Beat Detection Content</div>
              <Flex justifyContent={'center'} margin={"size-100"} width="100%">
                <ActionButton UNSAFE_className="flex-grow action-button" onPress={handleClick}>Run Detection</ActionButton>
                <ActionButton UNSAFE_className="flex-grow action-button">Add markers</ActionButton>
                <ActionButton UNSAFE_className="flex-grow action-button">Convert to Keyframes</ActionButton>
              </Flex>
              <CustomAccordion title="Advanced Features">
                <Flex direction="column" gap="size-200" width="100%">
                  <Flex alignItems="center" gap="size-100" width="100%">
                    <Slider label="Hop Length" value={hopLength} onChange={setHopLength} minValue={0} maxValue={1000} step={1} width="75%" />
                    <TooltipTrigger>
                      <ActionButton onPress={() => resetSlider(setHopLength, 512)} isQuiet>
                        <Text>Reset</Text>
                      </ActionButton>
                      <Tooltip>Reset to default</Tooltip>
                    </TooltipTrigger>
                  </Flex>
                  <Flex alignItems="center" gap="size-100" width="100%">
                    <Slider label="Tightness" value={tightness} onChange={setTightness} minValue={0} maxValue={1000} step={0.1} width="75%" />
                    <TooltipTrigger>
                      <ActionButton onPress={() => resetSlider(setTightness, 100)} isQuiet>
                        <Text>Reset</Text>
                      </ActionButton>
                      <Tooltip>Reset to default</Tooltip>
                    </TooltipTrigger>
                  </Flex>  
                  <Flex alignItems="center" gap="size-100" width="100%">
                    <Slider label="Start BPM" value={startBPM} onChange={setStartBPM} minValue={0} maxValue={200} step={1} width="75%" />
                    <TooltipTrigger>
                      <ActionButton onPress={() => resetSlider(setStartBPM, 120)} isQuiet>
                        <Text>Reset</Text>
                      </ActionButton>
                      <Tooltip>Reset to default</Tooltip>
                    </TooltipTrigger>
                  </Flex>
                </Flex>
              </CustomAccordion>
            </Item>
            <Item key="tab3">
              <div>Settings Content</div>
              <CustomAccordion title="Advanced Features">
                Here you can add advanced settings features...
              </CustomAccordion>
            </Item>
          </TabPanels>
        </Tabs>
      </div>
    </Provider>
  );
};

export default Main;
