import { exec } from 'child_process';
import { promisify } from 'util';

export const execPromised = promisify(exec);

export function getEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable '${key}' not set.`);
    }

    return value;
}

export async function getVersionLabel(): Promise<string> {
    const { stdout } = await execPromised('git rev-parse --short HEAD');

    const versionLabel = stdout.trim();
    if (!versionLabel) {
        throw new Error('Could not get version label.');
    }

    return versionLabel;
}

export async function executeCommands(commands: string[]): Promise<void> {
    for(let command of commands) {
        const stdout = await run(command);
        console.log(stdout);
    }
}

function run(command : string) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, _) => {
      if (err) return reject(err) 
      resolve(stdout)
    })
  })
}
