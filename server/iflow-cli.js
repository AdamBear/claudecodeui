import { spawn } from 'child_process';
import crossSpawn from 'cross-spawn';

// Use cross-spawn on Windows for better command execution
const spawnFunction = process.platform === 'win32' ? crossSpawn : spawn;

let activeIflowProcesses = new Map(); // Track active processes by session ID

async function spawnIflow(command, options = {}, ws) {
  return new Promise(async (resolve, reject) => {
    const { sessionId, cwd } = options;
    let capturedSessionId = sessionId;
    
    // Build iFlow CLI command
    // Usage: iflow -p "prompt"
    const args = [];
    
    if (command && command.trim()) {
      args.push('-p', command);
    }
    
    // Use cwd (actual project directory)
    const workingDir = cwd || process.cwd();
    
    console.log('Spawning iFlow CLI:', 'iflow', args.join(' '));
    console.log('Working directory:', workingDir);
    
    const iflowProcess = spawnFunction('iflow', args, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    // Store process reference
    const processKey = capturedSessionId || Date.now().toString();
    activeIflowProcesses.set(processKey, iflowProcess);
    
    // Handle stdout
    iflowProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('📤 iFlow stdout:', output);
      
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
    iflowProcess.stderr.on('data', (data) => {
      console.error('iFlow stderr:', data.toString());
      // Optional: send stderr as error or log
    });
    
    // Handle process completion
    iflowProcess.on('close', async (code) => {
      console.log(`iFlow process exited with code ${code}`);
      
      // Send final stop message
      ws.send(JSON.stringify({
        type: 'claude-response',
        data: {
          type: 'content_block_stop'
        }
      }));
      
      // Clean up process reference
      activeIflowProcesses.delete(processKey);

      ws.send(JSON.stringify({
        type: 'claude-complete',
        sessionId: processKey,
        exitCode: code,
        isNewSession: !sessionId
      }));
      
      if (code === 0) {
        resolve();
      } else {
        // Don't reject, just resolve so the UI doesn't crash
        resolve(); 
      }
    });
    
    iflowProcess.on('error', (error) => {
      console.error('iFlow process error:', error);
      activeIflowProcesses.delete(processKey);
      
      ws.send(JSON.stringify({
        type: 'claude-error',
        error: error.message
      }));
      
      reject(error);
    });
    
    iflowProcess.stdin.end();
  });
}

function abortIflowSession(sessionId) {
  const process = activeIflowProcesses.get(sessionId);
  if (process) {
    console.log(`🛑 Aborting iFlow session: ${sessionId}`);
    process.kill('SIGTERM');
    activeIflowProcesses.delete(sessionId);
    return true;
  }
  return false;
}

function isIflowSessionActive(sessionId) {
  return activeIflowProcesses.has(sessionId);
}

function getActiveIflowSessions() {
  return Array.from(activeIflowProcesses.keys());
}

export {
  spawnIflow,
  abortIflowSession,
  isIflowSessionActive,
  getActiveIflowSessions
};
