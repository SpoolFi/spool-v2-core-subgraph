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
