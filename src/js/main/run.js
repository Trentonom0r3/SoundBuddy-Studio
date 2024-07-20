const { exec } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const scriptPath = isWindows ? path.join(__dirname, 'python', 'run.bat') : path.join(__dirname,'python',  'run.sh');

const command = isWindows ? `cmd.exe /c ${scriptPath}` : `sh ${scriptPath}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing script: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Script stderr: ${stderr}`);
    return;
  }
  console.log(`Script stdout: ${stdout}`);
});
