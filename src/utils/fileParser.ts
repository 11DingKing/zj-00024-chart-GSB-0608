import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { DataField, FieldType } from '../types'

export interface ParsedFile {
  fileName: string
  fields: DataField[]
  rows: Record<string, any>[]
}

function inferFieldType(value: any): FieldType {
  if (value === null || value === undefined || value === '') {
    return 'text'
  }

  const strValue = String(value).trim()

  if (strValue === 'true' || strValue === 'false' || strValue === 'yes' || strValue === 'no') {
    return 'boolean'
  }

  if (!isNaN(Number(strValue)) && strValue !== '') {
    return 'number'
  }

  const dateRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(\s+\d{1,2}:\d{2}(:\d{2})?)?$/
  if (dateRegex.test(strValue)) {
    return 'date'
  }

  return 'text'
}

function convertValue(value: any, type: FieldType): any {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const strValue = String(value).trim()

  switch (type) {
    case 'number':
      const num = Number(strValue)
      return isNaN(num) ? null : num
    case 'boolean':
      return strValue.toLowerCase() === 'true' || strValue.toLowerCase() === 'yes'
    case 'date':
      const date = new Date(strValue)
      return isNaN(date.getTime()) ? null : date.toISOString()
    default:
      return strValue
  }
}

function inferFieldsAndRows(rawRows: Record<string, any>[]): { fields: DataField[]; rows: Record<string, any>[] } {
  if (rawRows.length === 0) {
    return { fields: [], rows: [] }
  }

  const fieldNames = Object.keys(rawRows[0])
  const fields: DataField[] = []

  for (const fieldName of fieldNames) {
    let inferredType: FieldType = 'text'
    for (const row of rawRows.slice(0, 100)) {
      const value = row[fieldName]
      if (value !== null && value !== undefined && value !== '') {
        inferredType = inferFieldType(value)
        break
      }
    }
    fields.push({ name: fieldName, type: inferredType })
  }

  const rows = rawRows.map((rawRow) => {
    const convertedRow: Record<string, any> = {}
    fields.forEach((field, index) => {
      const rawValue = rawRow[fieldNames[index]]
      convertedRow[field.name] = convertValue(rawValue, field.type)
    })
    return convertedRow
  })

  return { fields, rows }
}

export async function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { fields, rows } = inferFieldsAndRows(results.data as Record<string, any>[])
        resolve({
          fileName: file.name,
          fields,
          rows
        })
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

export async function parseJSON(file: File): Promise<ParsedFile> {
  const text = await file.text()
  let data = JSON.parse(text)

  if (!Array.isArray(data)) {
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data)
      if (keys.length === 1 && Array.isArray(data[keys[0]])) {
        data = data[keys[0]]
      } else {
        data = [data]
      }
    } else {
      throw new Error('Invalid JSON format')
    }
  }

  const { fields, rows } = inferFieldsAndRows(data)
  return {
    fileName: file.name,
    fields,
    rows
  }
}

export async function parseExcel(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet)

  const { fields, rows } = inferFieldsAndRows(jsonData as Record<string, any>[])
  return {
    fileName: file.name,
    fields,
    rows
  }
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'csv':
      return parseCSV(file)
    case 'json':
      return parseJSON(file)
    case 'xlsx':
    case 'xls':
      return parseExcel(file)
    default:
      throw new Error(`Unsupported file type: ${extension}`)
  }
}
