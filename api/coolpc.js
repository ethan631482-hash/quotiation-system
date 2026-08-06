const COOLPC_URL = 'https://coolpc.com.tw/evaluate.php'

function decodeEntities(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim()
}

function parseProducts(html) {
  const products = []

  for (const selectMatch of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const nameMatch = selectMatch[1].match(/\bname=[\"']n(\d+)[\"']/i)
    if (!nameMatch) continue

    const beforeSelect = html.slice(Math.max(0, selectMatch.index - 12000), selectMatch.index)
    const categoryMatches = [...beforeSelect.matchAll(/<td\b[^>]*class=[\"']t[\"'][^>]*>([\s\S]*?)<\/td>/gi)]
    const category = decodeEntities(categoryMatches.at(-1)?.[1] || '') || '原價屋品項'

    for (const optionMatch of selectMatch[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)) {
      if (/\bdisabled\b/i.test(optionMatch[1])) continue
      const text = decodeEntities(optionMatch[2])
      const prices = [...text.matchAll(/\$(\d[\d,]*)/g)].map(match => Number(match[1].replace(/,/g, '')))
      if (!prices.length) continue
      const name = text.replace(/,\s*\$[\s\S]*$/, '').trim()
      if (!name || name.startsWith('共有商品')) continue
      products.push({ category, name, spec: '', unitPrice: prices.at(-1) })
    }
  }

  const unique = new Map()
  for (const product of products) {
    const key = [product.category, product.name, product.unitPrice].join('::')
    if (!unique.has(key)) unique.set(key, product)
  }
  return [...unique.values()]
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' })

  try {
    const upstream = await fetch(COOLPC_URL, {
      headers: {
        'User-Agent': 'Quotation-System/1.0 (product catalog update)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!upstream.ok) throw new Error('CoolPC returned ' + upstream.status)

    const buffer = await upstream.arrayBuffer()
    const html = new TextDecoder('big5').decode(buffer)
    console.log('CoolPC response', upstream.status, upstream.url, upstream.headers.get('content-type'), buffer.byteLength, html.slice(0, 200))
    const products = parseProducts(html)
    if (!products.length) throw new Error('No products parsed')

    response.setHeader('Cache-Control', 'no-store')
    return response.status(200).json({
      source: COOLPC_URL,
      fetchedAt: new Date().toISOString(),
      products,
    })
  } catch (error) {
    console.error('CoolPC import failed', error)
    return response.status(502).json({ error: 'Unable to fetch CoolPC product catalog' })
  }
}
