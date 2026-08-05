import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const port = Number(process.env.PORT || 5180)
const dataDirectory = join(process.cwd(), 'data')
const dataFile = join(dataDirectory, 'app-data.json')

function isValidData(value) {
  return value && Array.isArray(value.quotes) && Array.isArray(value.categories) && Array.isArray(value.customers)
}

async function initialData() {
  const [quotes, categories, customers] = await Promise.all(['quotes', 'categories', 'customers'].map(async name => JSON.parse(await readFile(join(dataDirectory, `${name}.json`), 'utf8'))))
  return { quotes, categories, customers }
}

async function readData() {
  if (!existsSync(dataFile)) return initialData()
  const data = JSON.parse(await readFile(dataFile, 'utf8'))
  if (!isValidData(data)) throw new Error('Invalid data file')
  return data
}

async function writeData(data) {
  if (!isValidData(data)) throw new Error('Expected quotes, categories, and customers arrays')
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(dataFile, `${JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8')
}

function respond(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

createServer(async (req, res) => {
  if (req.url !== '/api/data') return respond(res, 404, { error: 'Not found' })
  try {
    if (req.method === 'GET') return respond(res, 200, await readData())
    if (req.method === 'PUT') {
      let raw = ''
      for await (const chunk of req) raw += chunk
      await writeData(JSON.parse(raw))
      return respond(res, 200, { ok: true })
    }
    return respond(res, 405, { error: 'Method not allowed' })
  } catch (error) {
    return respond(res, 400, { error: error.message })
  }
}).listen(port, '127.0.0.1', () => console.log(`Local data server listening at http://127.0.0.1:${port}`))
