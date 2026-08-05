import { get, put } from '@vercel/blob'

const pathname = 'quotation-manager/data.json'

function isValidData(value) {
  return value && Array.isArray(value.quotes) && Array.isArray(value.categories) && Array.isArray(value.customers)
}

function requestData(body) {
  if (typeof body === 'string') return JSON.parse(body)
  return body
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const blob = await get(pathname, { access: 'private', useCache: false })
      if (!blob || blob.statusCode !== 200) return response.status(404).json({ error: 'No data yet' })
      const data = JSON.parse(await new Response(blob.stream).text())
      return response.status(200).json(data)
    }

    if (request.method === 'PUT') {
      const data = requestData(request.body)
      if (!isValidData(data)) return response.status(400).json({ error: 'Expected quotes, categories, and customers arrays' })
      await put(pathname, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }), {
        access: 'private',
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        contentType: 'application/json; charset=utf-8',
      })
      return response.status(200).json({ ok: true })
    }

    return response.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Data API failed', error)
    return response.status(500).json({ error: 'Unable to access data storage' })
  }
}
