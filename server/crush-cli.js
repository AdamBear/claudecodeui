import { spawn } from 'child_process';
import crossSpawn from 'cross-spawn';

// Use cross-spawn on Windows for better command execution
const spawnFunction = process.platform === 'win32' ? crossSpawn : spawn;

let activeCrushProcesses = new Map(); // Track active processes by session ID

async function spawnCrush(command, options = {}, ws) {
    return new Promise(async (resolve, reject) => {
        const { sessionId, cwd } = options;
        let capturedSessionId = sessionId;

        // Build Crush CLI command
        // Usage: crush [prompt]
        // We assume crush accepts the prompt as arguments
        const args = [];

        if (command && command.trim()) {
            args.push(command);
        }

        // Use cwd (actual project directory)
        const workingDir = cwd || process.cwd();

        console.log('Spawning Crush CLI:', 'crush', args.join(' '));
        console.log('Working directory:', workingDir);

        // Crush is a TUI, so we might need to handle it differently if it doesn't support non-interactive mode well.
        // For now, we assume it writes to stdout.
        const crushProcess = spawnFunction('crush', args, {
            cwd: workingDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, CI: 'true' } // Set CI=true to potentially force simpler output
        });

        // Store process reference
        const processKey = capturedSessionId || Date.now().toString();
        activeCrushProcesses.set(processKey, crushProcess);

        // Handle stdout
        crushProcess.stdout.on('data', (data) => {
            const output = data.toString();
            // Strip ANSI codes for cleaner output, as Crush is likely to produce them
            const cleanOutput = output.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

            console.log('📤 Crush stdout:', cleanOutput);

            if (cleanOutput.trim()) {
                // Send as Claude-compatible format for frontend
                ws.send(JSON.stringify({
                    type: 'claude-response',
                    data: {
                        type: 'content_block_delta',
                        delta: {
                            type: 'text_delta',
                            text: cleanOutput
                        }
                    }
                }));
            }
        });

        // Handle stderr
        crushProcess.stderr.on('data', (data) => {
            const output = data.toString();
            // Strip ANSI codes
            const cleanOutput = output.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
            console.error('Crush stderr:', cleanOutput);
        });

        // Handle process completion
        crushProcess.on('close', async (code) => {
            console.log(`Crush process exited with code ${code}`);

            // Send final stop message
            ws.send(JSON.stringify({
                type: 'claude-response',
                data: {
                    type: 'content_block_stop'
                }
            }));

            // Clean up process reference
            activeCrushProcesses.delete(processKey);

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

        crushProcess.on('error', (error) => {
            console.error('Crush process error:', error);
            activeCrushProcesses.delete(processKey);

            ws.send(JSON.stringify({
                type: 'claude-error',
                error: error.message
            }));

            reject(error);
        });

        crushProcess.stdin.end();
    });
}

function abortCrushSession(sessionId) {
    const process = activeCrushProcesses.get(sessionId);
    if (process) {
        console.log(`🛑 Aborting Crush session: ${sessionId}`);
        process.kill('SIGTERM');
        activeCrushProcesses.delete(sessionId);
        return true;
    }
    return false;
}

function isCrushSessionActive(sessionId) {
    return activeCrushProcesses.has(sessionId);
}

function getActiveCrushSessions() {
    return Array.from(activeCrushProcesses.keys());
}

export {
    spawnCrush,
    abortCrushSession,
    isCrushSessionActive,
    getActiveCrushSessions
};
