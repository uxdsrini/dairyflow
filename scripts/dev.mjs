import { spawn } from 'node:child_process';

const children = [];

const run = (label, command, args, color) => {
  const child = spawn(command, args, {
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: process.env,
  });

  const write = (stream, prefixColor, data) => {
    const text = data.toString();
    const lines = text.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      stream.write(`${prefixColor}[${label}] \x1b[0m${line}\n`);
    }
  };

  child.stdout.on('data', (data) => write(process.stdout, color, data));
  child.stderr.on('data', (data) => write(process.stderr, color, data));

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  children.push(child);
  return child;
};

run('server', 'npm', ['run', 'dev:server'], '\x1b[35m');
run('web', 'npm', ['run', 'dev:web'], '\x1b[32m');

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
