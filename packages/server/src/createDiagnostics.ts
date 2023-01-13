import { parse, ParseError } from '@joe-re/sql-parser'
import log4js from 'log4js'
import { PublishDiagnosticsParams, Diagnostic } from 'vscode-languageserver'
import { DiagnosticSeverity } from 'vscode-languageserver-types'
import { lint, ErrorLevel, LintResult, RawConfig } from 'sqlint'
import cache, { LintCache } from './cache'

const logger = log4js.getLogger()

function doLint(
  uri: string,
  sql: string,
  config?: RawConfig | null
): Diagnostic[] {
  if (!sql) {
    return []
  }
  const result: LintResult[] = JSON.parse(
    lint({
      configPath: process.cwd(),
      formatType: 'json',
      text: sql,
      configObject: config,
    })
  )
  const lintDiagnostics = result.map((v) => v.diagnostics).flat()
  const lintCache: LintCache[] = []
  const diagnostics = lintDiagnostics.map((v) => {
    const diagnostic = {
      range: {
        start: {
          line: v.location.start.line - 1,
          character: v.location.start.column - 1,
        },
        end: {
          line: v.location.end.line - 1,
          character: v.location.end.column - 1,
        },
      },
      message: v.message,
      severity:
        v.errorLevel === ErrorLevel.Error
          ? DiagnosticSeverity.Error
          : DiagnosticSeverity.Warning,
      source: 'sql',
      relatedInformation: [],
    }
    lintCache.push({ diagnostic, lint: v })
    return diagnostic
  })
  cache.setLintCache(uri, lintCache)
  return diagnostics
}

export default function createDiagnostics(
  uri: string,
  sql: string,
  config?: RawConfig | null
): PublishDiagnosticsParams {
  logger.debug(`createDiagnostics`)
  logger.debug(`sql:`,sql)
  let diagnostics: Diagnostic[] = []
  let sqlArry = sql.split(';')
  let lineNum = 0
  sqlArry.filter(i => i).forEach(sqlItem => {
    console.log("---------------------")
    console.log("sqlItem:",sqlItem)
    console.log("lineNum =",lineNum)
    sqlError(uri,sqlItem,lineNum).forEach(item =>{
     diagnostics.push(item)
    })
    lineNum = sqlItem.split("\n").length+lineNum-1
    console.log("lineNum+",lineNum)
  });
  //console.log("diagnostics:",JSON.stringify(diagnostics))
  logger.debug(`diagnostics: ${JSON.stringify(diagnostics)}`)
  return { uri: uri, diagnostics }
}

function sqlError(uri: string,
  sql: string,lineNum: number):Diagnostic[]{
    let diagnostics: Diagnostic[] = []
  try {
    const ast = parse(sql)
    logger.debug(`ast: ${JSON.stringify(ast)}`)
    diagnostics = doLint(uri, sql)
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    logger.debug('parse error')
    logger.debug(e)
    cache.setLintCache(uri, [])
    if (err.name !== 'SyntaxError') {
      throw e
    }
    const pe = e as ParseError
    diagnostics.push({
      range: {
        start: {
          //line: lineNum,
          line: pe.location.start.line - 1 + lineNum,
          character: pe.location.start.column,
        },
        end: {
          //line: lineNum,
          line: pe.location.end.line - 1 + lineNum,
          character: pe.location.end.column,
        },
      },
      message: pe.message,
      severity: DiagnosticSeverity.Error,
      source: 'sql',
      relatedInformation: [],
    })
  }
  return diagnostics
}

