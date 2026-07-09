#!/usr/bin/env node
/**
 * 从 vshop-server/prisma/schema.prisma 生成数据库文档：
 * 1. docs/database/data-dictionary.md   数据字典
 * 2. docs/database/er-diagram.md        Mermaid ER 图
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SCHEMA_PATH = path.join(ROOT, 'vshop-server', 'prisma', 'schema.prisma')
const OUT_DIR = path.join(ROOT, 'docs', 'database')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readSchema() {
  return fs.readFileSync(SCHEMA_PATH, 'utf8')
}

function parseComment(line) {
  const m = line.match(/\/\/\s*(.+)$/)
  return m ? m[1].trim() : ''
}

function stripComment(line) {
  return line.replace(/\/\/.*$/, '').trim()
}

function parseFieldLine(line) {
  const clean = stripComment(line)
  if (!clean) return null

  // 字段名 类型 [属性...]
  const m = clean.match(/^(\w+)\s+([\w\[\]?]+)(?:\s+(.*))?$/)
  if (!m) return null

  const [, name, rawType, rawAttrs = ''] = m
  const isList = rawType.endsWith('[]')
  const isOptional = rawType.endsWith('?')
  const baseType = rawType.replace(/(\[\]|\?)$/, '')

  return {
    name,
    rawType,
    baseType,
    isList,
    isOptional,
    attributes: rawAttrs.trim(),
    comment: parseComment(line),
  }
}

function parseIndexLine(line) {
  const clean = stripComment(line)
  const m = clean.match(/^@@(\w+)\(([^)]+)\)$/)
  if (!m) return null
  const [, kind, content] = m
  const fields = content.split(',').map(s => s.trim().replace(/[\[\]"]/g, ''))
  return { kind, fields, comment: parseComment(line) }
}

function parseEnumValueLine(line) {
  const clean = stripComment(line)
  if (!clean || clean.startsWith('}')) return null
  return { value: clean, comment: parseComment(line) }
}

function parseBlocks(src, keyword) {
  const blocks = []
  const regex = new RegExp(`${keyword}\\s+(\\w+)\\s*\\{`, 'g')
  let m
  while ((m = regex.exec(src)) !== null) {
    const name = m[1]
    const start = m.index + m[0].length
    let depth = 1
    let end = start
    while (end < src.length && depth > 0) {
      const ch = src[end]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      end++
    }
    const body = src.slice(start, end - 1)
    blocks.push({ name, body, startIndex: m.index })
  }
  return blocks
}

function parseSchema(text) {
  const modelBlocks = parseBlocks(text, 'model')
  const enumBlocks = parseBlocks(text, 'enum')

  const models = modelBlocks.map(({ name, body, startIndex }) => {
    // 尝试获取模型上方的注释（从 model 关键字位置往前）
    const preceding = text.slice(0, startIndex)
    const linesBefore = preceding.split('\n')
    const descriptionLines = []
    for (let i = linesBefore.length - 1; i >= 0; i--) {
      const l = linesBefore[i].trim()
      if (l.startsWith('//')) {
        descriptionLines.unshift(l.replace(/^\/\/\s*/, ''))
      } else if (l === '' || l.startsWith('model ') || l.startsWith('enum ') || l.startsWith('}')) {
        break
      }
    }

    const fields = []
    const indexes = []
    const bodyLines = body.split('\n')
    let pendingComment = ''

    for (const rawLine of bodyLines) {
      const line = rawLine.trim()
      if (!line) continue
      if (line.startsWith('//')) {
        pendingComment = pendingComment
          ? `${pendingComment} ${line.replace(/^\/\/\s*/, '').trim()}`
          : line.replace(/^\/\/\s*/, '').trim()
        continue
      }

      if (line.startsWith('@@')) {
        const idx = parseIndexLine(line)
        if (idx) {
          idx.comment = [pendingComment, idx.comment].filter(Boolean).join(' ')
          indexes.push(idx)
        }
        pendingComment = ''
        continue
      }

      const field = parseFieldLine(line)
      if (field) {
        if (pendingComment) {
          field.comment = field.comment
            ? `${pendingComment} ${field.comment}`
            : pendingComment
        }
        fields.push(field)
      }
      pendingComment = ''
    }

    return {
      name,
      description: descriptionLines.join('\n'),
      fields,
      indexes,
    }
  })

  const enums = enumBlocks.map(({ name, body }) => {
    const values = []
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('}')) continue
      const v = parseEnumValueLine(line)
      if (v) values.push(v)
    }
    return { name, values }
  })

  return { models, enums }
}

function extractAttributeValue(attrs, name) {
  const start = attrs.indexOf(`${name}(`)
  if (start === -1) return null
  let depth = 1
  let i = start + name.length + 1
  while (i < attrs.length && depth > 0) {
    if (attrs[i] === '(') depth++
    else if (attrs[i] === ')') depth--
    i++
  }
  return attrs.slice(start + name.length + 1, i - 1)
}

function getConstraintText(field) {
  const attrs = field.attributes
  const parts = []
  if (attrs.includes('@id')) parts.push('主键')
  if (attrs.includes('@unique')) parts.push('唯一')
  const defaultValue = extractAttributeValue(attrs, '@default')
  if (defaultValue != null) parts.push(`默认 ${defaultValue}`)
  if (attrs.includes('@updatedAt')) parts.push('自动更新')
  if (attrs.includes('@relation')) {
    const relContent = extractAttributeValue(attrs, '@relation')
    if (relContent != null) {
      const refMatch = relContent.match(/references:\s*\[([^\]]+)\]/)
      const onDeleteMatch = relContent.match(/onDelete:\s*(\w+)/)
      const ref = refMatch ? `→ ${refMatch[1]}` : ''
      const onDelete = onDeleteMatch ? `, 级联${onDeleteMatch[1]}` : ''
      parts.push(`外键 ${ref}${onDelete}`)
    }
  }
  return parts.join(' / ') || '-'
}

function getFieldDescription(field, enums) {
  const parts = []
  if (field.comment) parts.push(field.comment)
  if (field.isList) parts.push('数组')
  if (field.attributes.includes('@relation')) {
    parts.push(`关联 ${field.baseType}`)
  }
  return parts.join('；') || '-'
}

function isRequired(field) {
  if (field.isList) return '是（数组）'
  return field.isOptional || field.attributes.includes('@default') ? '否' : '是'
}

function generateDataDictionary({ models, enums }) {
  const lines = []
  lines.push('# 数据库数据字典')
  lines.push('')
  lines.push(`> 自动生成于 ${new Date().toLocaleString('zh-CN')}，源文件：\`vshop-server/prisma/schema.prisma\``)
  lines.push('')
  lines.push('## 目录')
  lines.push('')
  models.forEach(m => {
    lines.push(`- [${m.name}](#${m.name.toLowerCase()})`)
  })
  if (enums.length) {
    lines.push('')
    lines.push('- [枚举类型](#枚举类型)')
  }
  lines.push('')

  models.forEach(m => {
    lines.push(`## ${m.name}`)
    if (m.description) {
      lines.push('')
      lines.push(m.description)
    }
    lines.push('')
    lines.push('| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |')
    lines.push('|------|------|:--:|------|------|')
    m.fields.forEach(f => {
      lines.push(
        `| \`${f.name}\` | ${f.rawType} | ${isRequired(f)} | ${getConstraintText(f)} | ${getFieldDescription(f, enums)} |`,
      )
    })

    if (m.indexes.length) {
      lines.push('')
      lines.push('**索引**')
      lines.push('')
      lines.push('| 类型 | 字段 | 说明 |')
      lines.push('|------|------|------|')
      m.indexes.forEach(idx => {
        lines.push(`| ${idx.kind} | ${idx.fields.map(f => `\`${f}\``).join(', ')} | ${idx.comment || '-'} |`)
      })
    }
    lines.push('')
  })

  if (enums.length) {
    lines.push('## 枚举类型')
    lines.push('')
    enums.forEach(e => {
      lines.push(`### ${e.name}`)
      lines.push('')
      lines.push('| 值 | 说明 |')
      lines.push('|------|------|')
      e.values.forEach(v => {
        lines.push(`| \`${v.value}\` | ${v.comment || '-'} |`)
      })
      lines.push('')
    })
  }

  return lines.join('\n')
}

function generateErDiagram({ models, enums }) {
  const modelNames = new Set(models.map(m => m.name))

  // 预处理关系
  const relations = []
  const relationKey = (a, b) => [a, b].sort().join('---')
  const seen = new Set()

  models.forEach(m => {
    m.fields.forEach(f => {
      if (!modelNames.has(f.baseType)) return

      const target = models.find(x => x.name === f.baseType)
      const reverseFields = target.fields.filter(
        rf => rf.baseType === m.name && modelNames.has(rf.baseType),
      )
      const reverseIsList = reverseFields.some(rf => rf.isList)
      const reverseIsOptional = reverseFields.some(rf => rf.isOptional)
      const key = relationKey(m.name, f.baseType)

      if (seen.has(key)) return
      seen.add(key)

      // 确定基数
      let card
      if (f.isList && reverseFields.length && !reverseIsList) {
        // m 1:N target
        card = '||--o{'
      } else if (!f.isList && reverseIsList) {
        // target 1:N m
        card = 'o{--||'
      } else if (f.isList && reverseIsList) {
        // N:M（当前 schema 没有）
        card = 'o{--o{'
      } else if (!f.isList && !reverseIsList && reverseFields.length) {
        // 一对一
        if (f.isOptional || reverseIsOptional) {
          card = '||--o|'
        } else {
          card = '||--||'
        }
      } else {
        // 只有单向引用
        card = f.isList ? '||--o{' : '||--o|'
      }

      // 让基数多的那一侧始终出现在右侧/下方比较统一：
      // 如果 card 是 o{--||（target 1:N m），反转方向写成 target ||--o{ m
      let left = m.name
      let right = f.baseType
      let relationCard = card
      if (card === 'o{--||') {
        left = f.baseType
        right = m.name
        relationCard = '||--o{'
      }

      const label = f.isList
        ? f.name
        : reverseFields.find(rf => rf.isList)?.name || f.name

      relations.push(`${left} ${relationCard} ${right} : "${label}"`)
    })
  })

  const scalarType = (rawType) => rawType.replace(/\?/g, '').replace(/\[\]/g, '_list')

  const lines = []
  lines.push('# 数据库 ER 图')
  lines.push('')
  lines.push(`> 自动生成于 ${new Date().toLocaleString('zh-CN')}，源文件：\`vshop-server/prisma/schema.prisma\``)
  lines.push('')
  lines.push('```mermaid')
  lines.push('erDiagram')

  models.forEach(m => {
    lines.push(`    ${m.name} {`)
    m.fields.forEach(f => {
      const type = scalarType(f.rawType)
      lines.push(`        ${type} ${f.name}`)
    })
    lines.push('    }')
  })

  lines.push('')
  relations.forEach(r => lines.push(`    ${r}`))

  lines.push('```')
  lines.push('')

  return lines.join('\n')
}

function main() {
  ensureDir(OUT_DIR)
  const text = readSchema()
  const schema = parseSchema(text)

  const ddPath = path.join(OUT_DIR, 'data-dictionary.md')
  const erPath = path.join(OUT_DIR, 'er-diagram.md')

  fs.writeFileSync(ddPath, generateDataDictionary(schema), 'utf8')
  fs.writeFileSync(erPath, generateErDiagram(schema), 'utf8')

  console.log(`已生成：\n  ${ddPath}\n  ${erPath}`)
}

main()
