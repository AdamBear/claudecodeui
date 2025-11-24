import { spawn } from 'child_process';
import crossSpawn from 'cross-spawn';

// Use cross-spawn on Windows for better command execution
const spawnFunction = process.platform === 'win32' ? crossSpawn : spawn;

let activeOpencodeProcesses = new Map(); // Track active processes by session ID

async function spawnOpencode(command, options = {}, ws) {
    return new Promise(async (resolve, reject) => {
        const { sessionId, cwd } = options;
        let capturedSessionId = sessionId;

        // Build OpenCode CLI command
        // Usage: opencode run "prompt"
        const args = ['run'];

        if (command && command.trim()) {
            args.push(command);
        }

        // Use cwd (actual project directory)
        const workingDir = cwd || process.cwd();

        console.log('Spawning OpenCode CLI:', 'opencode', args.join(' '));
        console.log('Working directory:', workingDir);

        const opencodeProcess = spawnFunction('opencode', args, {
            cwd: workingDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env }
        });

        // Store process reference
        const processKey = capturedSessionId || Date.now().toString();
        activeOpencodeProcesses.set(processKey, opencodeProcess);

        // Handle stdout
        opencodeProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('📤 OpenCode stdout:', output);

            // Send as Claude-compatible format for frontend
            ws.send(JSON.stringify({
                type: 'claude-response',
                data: {
                    type: 'content_block_delta',
                    delta: {
                        type: 'text_delta',
                        text: output
                    }
                }
            }));
        });

        // Handle stderr
        opencodeProcess.stderr.on('data', (data) => {
            console.error('OpenCode stderr:', data.toString());
        });

        // Handle process completion
        opencodeProcess.on('close', async (code) => {
            console.log(`OpenCode process exited with code ${code}`);

            // Send final stop message
            ws.send(JSON.stringify({
                type: 'claude-response',
                data: {
                    type: 'content_block_stop'
                }
            }));

            // Clean up process reference
            activeOpencodeProcesses.delete(processKey);

            ws.send(JSON.stringify({
                type: 'claude-complete',
                sessionId: processKey,
                exitCode: code,
                isNewSession: !sessionId
            }));

            if (code === 0) {
                resolve();
            } else {
                resolve();
            }
        });

        opencodeProcess.on('error', (error) => {
            console.error('OpenCode process error:', error);
            activeOpencodeProcesses.delete(processKey);

            ws.send(JSON.stringify({
                type: 'claude-error',
                error: error.message
            }));

            reject(error);
        });

        opencodeProcess.stdin.end();
    });
}

function abortOpencodeSession(sessionId) {
    const process = activeOpencodeProcesses.get(sessionId);
    if (process) {
        console.log(`🛑 Aborting OpenCode session: ${sessionId}`);
        process.kill('SIGTERM');
        activeOpencodeProcesses.delete(sessionId);
        return true;
    }
    return false;
}

function isOpencodeSessionActive(sessionId) {
    return activeOpencodeProcesses.has(sessionId);
}

function getActiveOpencodeSessions() {
    return Array.from(activeOpencodeProcesses.keys());
}

export {
    spawnOpencode,
    abortOpencodeSession,
    isOpencodeSessionActive,
    getActiveOpencodeSessions
};
