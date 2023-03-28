import log4js from 'log4js'
import { PublishDiagnosticsParams, Diagnostic } from 'vscode-languageserver'
import { DiagnosticSeverity } from 'vscode-languageserver-types'
import { RawConfig } from 'sqlint'
import cache from './cache'
import { SparkSQL,GenericSQL,HiveSQL,FlinkSQL } from 'dt-sql-parser';

const logger = log4js.getLogger()

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
  logger.debug(`sql:`,sql)
  let suffix = uri.substring(uri.lastIndexOf('.') + 1)
  let diagnostics: Diagnostic[] = []
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

