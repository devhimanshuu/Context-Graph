import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const [, , dir, cmd, ...args] = process.argv

if (!dir || !cmd) {
  console.error('Usage: node scripts/run-in.mjs <directory> <command> [...args]')
  process.exit(1)
}

const cwd = resolve(process.cwd(), dir)

const res = spawnSync('npx', [cmd, ...args], {
  cwd,
  stdio: 'inherit',
  shell: true,
})

if (res.error) {
  console.error(res.error)
  process.exit(1)
}

process.exit(res.status ?? 0)
