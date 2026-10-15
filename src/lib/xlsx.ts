/**
 * Minimal .xlsx reader.
 *
 * MetaTrader 5 writes its XML parts as UTF-16 (with a BOM), which most generic
 * xlsx libraries refuse to open. This reader handles both UTF-16 and UTF-8 and
 * only supports what a MT5 report needs: the first worksheet, shared strings,
 * numbers and inline strings.
 */
import { unzipSync } from 'fflate'

export type Cell = string | number | boolean | null
export type Rows = Cell[][]

function decode(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes)
  return new TextDecoder('utf-8').decode(bytes) // also strips a UTF-8 BOM
}

function unescapeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    switch (e.toLowerCase()) {
      case 'amp': return '&'
      case 'lt': return '<'
      case 'gt': return '>'
      case 'quot': return '"'
      case 'apos': return "'"
    }
    const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
    return String.fromCodePoint(code)
  })
}

function textOf(xml: string): string {
  let out = ''
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1]
  return unescapeXml(out)
}

function colIndex(ref: string): number {
  let n = 0
  for (const ch of ref.replace(/[^A-Za-z]/g, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export function readFirstSheet(data: ArrayBuffer | Uint8Array): Rows {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error('That file is not a valid .xlsx workbook.')
  }

  const sheetName = Object.keys(files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(n))
    .sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10))[0]
  if (!sheetName) throw new Error('No worksheet found in that file.')

  const shared: string[] = []
  if (files['xl/sharedStrings.xml']) {
    const sst = decode(files['xl/sharedStrings.xml'])
    for (const m of sst.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]))
  }

  const sheet = decode(files[sheetName])
  const rows: Rows = []
  for (const rowMatch of sheet.matchAll(/<row\s([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowNum = Number(/\br="(\d+)"/.exec(rowMatch[1])?.[1])
    if (!rowNum || !rowMatch[2]) continue
    const row: Cell[] = []
    for (const c of rowMatch[2].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1]
      const body = c[2]
      if (!body) continue
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1]
      if (!ref) continue
      const type = /\bt="(\w+)"/.exec(attrs)?.[1]
      let value: Cell = null
      if (type === 'inlineStr') {
        value = textOf(body)
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]
        if (v !== undefined) {
          if (type === 's') value = shared[Number(v)] ?? null
          else if (type === 'str') value = unescapeXml(v)
          else if (type === 'b') value = v === '1'
          else if (type === 'e') value = null
          else value = Number(v)
        }
      }
      row[colIndex(ref)] = value
    }
    // fill holes with null so every row is a dense array
    for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = null
    rows[rowNum - 1] = row
  }
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = []
  return rows
}
