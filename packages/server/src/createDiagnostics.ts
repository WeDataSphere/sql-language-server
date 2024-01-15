import { parse, ParseError } from '@joe-re/sql-parser'
import log4js from 'log4js'
import { PublishDiagnosticsParams, Diagnostic } from 'vscode-languageserver'
import { DiagnosticSeverity } from 'vscode-languageserver-types'
import { lint, ErrorLevel, LintResult, RawConfig } from 'sqlint'
import cache, { LintCache } from './cache'
import { SparkSQL,GenericSQL,HiveSQL,FlinkSQL,splitSql } from 'dt-sql-parser';

const logger = log4js.getLogger()
const regex = /\$\{([^}]+)\}/g;

function getParser(type: string){
  let parser;
  switch(type){
   case 'sql':
     parser = new SparkSQL()
     break
   case 'hql':
     parser = new HiveSQL()
     break 
   case 'fql':
     parser = new FlinkSQL()
     break 
   default:
     parser = new GenericSQL()
     break
  }
  return parser;
}

export default function createDiagnostics(
  uri: string,
  sql: string,
  config?: RawConfig | null
): PublishDiagnosticsParams {
  logger.debug(`into method createDiagnostics`)
  let suffix = uri.substring(uri.lastIndexOf('.') + 1)
  let diagnostics: Diagnostic[] = []
  sql = strReplace(sql)
  if(sql === ""){
    return diagnostics
  }
  const parser = getParser(suffix)
  const errors = parser.validate(sql)
  cache.setLintCache(uri, [])
  errors.forEach(error => {
    diagnostics.push({
      range: {
        start: {
          line: error.startLine - 1,
          character: error.startCol,
        },
        end: {
          line: error.endLine - 1,
          character: error.endCol,
        },
      },
      message: error.message,
      severity: DiagnosticSeverity.Error,
      source: 'sql',
      relatedInformation: [],
    })
  })
  return { uri: uri, diagnostics }
}

function sqlError(uri: string,
  sql: string,parser: GenericSQL):Diagnostic[]{
    let diagnostics: Diagnostic[] = []
    const errors = parser.validate(sql)
    cache.setLintCache(uri, [])
    diagnostics.push({
      range: {
        start: {
          line: errors.startLine,
          character: errors.startCol,
        },
        end: {
          line: errors.endLine,
          character: errors.endCol,
        },
      },
      message: errors.message,
      severity: DiagnosticSeverity.Error,
      source: 'sql',
      relatedInformation: [],
    })
  return diagnostics
}

function strReplace(text:string){
  return text.replace(regex, "'$&'");
}

