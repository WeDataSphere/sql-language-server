import * as fs from 'fs'
import path from 'path'
import process from 'process'
import {
  Connection,
  InitializeResult,
  CompletionItem,
  CompletionParams,
} from 'vscode-languageserver/node'
import { LSPObject, TextDocuments } from 'vscode-languageserver'
import { CompletionTriggerKind } from 'vscode-languageserver-protocol/lib/common/protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  CodeAction,
  TextDocumentEdit,
  TextEdit,
  Position,
  CodeActionKind,
} from 'vscode-languageserver-types'
import { lint, LintResult } from 'sqlint'
import log4js from 'log4js'
import { RawConfig } from 'sqlint'
import cache from './cache'
import { complete } from './complete'
import createDiagnostics from './createDiagnostics'
import createConnection from './createConnection'
import SettingStore, { Connection as SettingConnection } from './SettingStore'
import { Schema } from './database_libs/AbstractClient'
import getDatabaseClient from './database_libs/getDatabaseClient'
import initializeLogging from './initializeLogging'
import { RequireSqlite3Error } from './database_libs/Sqlite3Client'
import { syncBody } from './database_libs/CommonUtils'

export type ConnectionMethod = 'node-ipc' | 'stdio'

const TRIGGER_CHARATER = '.'
const insertTable = ''
const map_schema={}
const cache_tables=[]

export const map_colums={}
//let schema: Schema = { tables: [], functions: [] }

export type ColumsInfo = {
  columnComment: string | null
  columnName: string
  columnType: string
}

export function createServerWithConnection(
  connection: Connection,
  dss_cookie: string,
  debug = false
) {
  initializeLogging(debug)
  //赋值cookie到全局变量
  global.cookies=dss_cookie
  absolveCookies(dss_cookie)
  console.log("createServerWithConnection cookie:",dss_cookie)
  const logger = log4js.getLogger()
  const documents = new TextDocuments(TextDocument)
  documents.listen(connection)
  let schema: Schema = { tables: [], functions: [] }
  let hasConfigurationCapability = false
  let rootPath = ''
  let lintConfig: RawConfig | null | undefined

  // Read schema file
  function readJsonSchemaFile(filePath: string) {
    if (filePath[0] === '~') {
      const home = process.env.HOME || ''
      filePath = path.join(home, filePath.slice(1))
    }

    logger.info(`loading schema file: ${filePath}`)
    const data = fs.readFileSync(filePath, 'utf8').replace(/^\ufeff/u, '')
    try {
      schema = JSON.parse(data)
    } catch (e) {
      const err = e as NodeJS.ErrnoException
      logger.error('failed to read schema file ' + err.message)
      connection.sendNotification('sqlLanguageServer.error', {
        message:
          'Failed to read schema file: ' + filePath + ' error: ' + err.message,
      })
      throw e
    }
  }

  function readAndMonitorJsonSchemaFile(filePath: string) {
    fs.watchFile(filePath, () => {
      logger.info(`change detected, reloading schema file: ${filePath}`)
      readJsonSchemaFile(filePath)
    })
    // The readJsonSchemaFile function can throw exceptions so
    // read file only after setting up monitoring
    readJsonSchemaFile(filePath)
  }

  async function makeDiagnostics(document: TextDocument) {
    const hasRules =
      !!lintConfig && Object.prototype.hasOwnProperty.call(lintConfig, 'rules')
    const diagnostics = createDiagnostics(
      document.uri,
      document.getText(),
      hasRules ? lintConfig : null
    )
    connection.sendDiagnostics(diagnostics)
  }

  documents.onDidChangeContent(async (params) => {
    logger.debug(
      `onDidChangeContent: ${params.document.uri}, ${params.document.version}`
    )
    makeDiagnostics(params.document)
  })

  connection.onInitialize((params): InitializeResult => {
    const capabilities = params.capabilities
    // JupyterLab sends didChangeConfiguration information
    // using both the workspace.configuration and
    // workspace.didChangeConfiguration
    hasConfigurationCapability =
      !!capabilities.workspace &&
      (!!capabilities.workspace.configuration ||
        !!capabilities.workspace.didChangeConfiguration)

    logger.debug(`onInitialize: ${params.rootPath}`)
    rootPath = params.rootPath || ''

    return {
      capabilities: {
        textDocumentSync: 1,
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: [TRIGGER_CHARATER],
        },
        renameProvider: true,
        codeActionProvider: true,
        executeCommandProvider: {
          commands: [
            'sqlLanguageServer.switchDatabaseConnection',
            'sqlLanguageServer.fixAllFixableProblems',
          ],
        },
      },
    }
  })

  connection.onInitialized(async () => {
    SettingStore.getInstance().on('change', async () => {
      logger.debug('onInitialize: receive change event from SettingStore')
      try {
        try {
          connection.sendNotification('sqlLanguageServer.finishSetup', {
            personalConfig: SettingStore.getInstance().getPersonalConfig(),
            config: SettingStore.getInstance().getSetting(),
          })
        } catch (e) {
          logger.error(e)
        }
        const setting = SettingStore.getInstance().getSetting()
        if (setting.adapter == 'json') {
          // Loading schema from json file
          const path = setting.filename || ''
          if (path == '') {
            logger.error('filename must be provided')
            connection.sendNotification('sqlLanguageServer.error', {
              message: 'filename must be provided',
            })
            throw 'filename must be provided'
          }
          readAndMonitorJsonSchemaFile(path)
        } else {
          // Else get schema form database client
          try {
            const client = getDatabaseClient(
              SettingStore.getInstance().getSetting()
            )
            //console.log("get schema",JSON.stringify(schema),JSON.stringify(schema)==='{"tables":[],"functions":[]}')
            console.log("user if global.ticketId:",global.ticketId)
            console.log("!Object.keys(map_schema).includes(global.ticketId)==>",Object.keys(map_schema),global.ticketId,!Object.keys(map_schema).includes(global.ticketId))
            if(JSON.stringify(schema)==='{"tables":[],"functions":[]}'&&Object.keys(map_schema)===0){
               console.log("process in call get schema 1")
               schema = await client.getSchema()
               map_schema[global.ticketId] = schema  
            }else if(!Object.keys(map_schema).includes(global.ticketId)){
               console.log("process in call get schema 2")
               schema = await client.getSchema()
               map_schema[global.ticketId] = schema
            }else{
               schema = map_schema[global.ticketId]
            }
          } catch (e) {
            logger.error('failed to get schema info')
            if (e instanceof RequireSqlite3Error) {
              connection.sendNotification('sqlLanguageServer.error', {
                message: 'Need to rebuild sqlite3 module.',
              })
            }
            throw e
          }
        }
      } catch (e) {
        logger.error(e)
      }
    })
    const connections =
      (hasConfigurationCapability &&
        (
          await connection.workspace.getConfiguration({
            section: 'sqlLanguageServer',
          })
        )?.connections) ||
      []
    if (connections.length > 0) {
      SettingStore.getInstance().setSettingFromWorkspaceConfig(connections)
    } else if (rootPath) {
      SettingStore.getInstance().setSettingFromFile(
         path.join(path.resolve(__dirname, '../../../'), '.sqllsrc.json'),  
      //`${process.env.HOME}/.config/sql-language-server/.sqllsrc.json`,
        `${rootPath}/.sqllsrc.json`,
        rootPath || ''
      )
    }
  })

  connection.onDidChangeConfiguration((change) => {
    logger.debug('onDidChangeConfiguration', JSON.stringify(change))
    if (!hasConfigurationCapability) {
      return
    }
    if (
      !Object.prototype.hasOwnProperty.call(
        change.settings,
        'sqlLanguageServer'
      )
    ) {
      logger.debug(
        'onDidChangeConfiguration',
        "it doesn't have sqlLanguageServer property"
      )
      return
    }
    const sqlLanguageServerSetting = (change.settings as LSPObject)
      .sqlLanguageServer as LSPObject

    const connections = (sqlLanguageServerSetting.connections ??
      []) as SettingConnection[]
    if (connections.length > 0) {
      SettingStore.getInstance().setSettingFromWorkspaceConfig(connections)
    }

    // On configuration changes we retrieve the lint config
    const lint = sqlLanguageServerSetting.lint as RawConfig
    lintConfig = lint
    if (lint?.rules) {
      documents.all().forEach((v) => {
        makeDiagnostics(v)
      })
    }
  })

  connection.onCompletion((docParams: CompletionParams): CompletionItem[] => {
    // Make sure the client does not send use completion request for characters
    // other than the dot which we asked for.
    //console.log("createServer conCompletion docParams:",JSON.stringify(docParams))
    //logger.info("createServer conCompletion docParams:",JSON.stringify(docParams))
    if (
      docParams.context?.triggerKind == CompletionTriggerKind.TriggerCharacter
    ) {
      if (docParams.context?.triggerCharacter != TRIGGER_CHARATER) {
        return []
      }
    }
    logger.info("createServer onCompletion docParams:",docParams)
    const text = documents.get(docParams.textDocument.uri)?.getText()
    if (!text) {
      return []
    }
    logger.debug(text || '')
    const pos = {
      line: docParams.position.line,
      column: docParams.position.character,
    }
    const setting = SettingStore.getInstance().getSetting()
    logger.info("createServer get setting:",setting);
    logger.info("createServer onCompletion get schema:",schema);
    const candidates = complete(
      text,
      pos,
      schema,
      setting.jupyterLabMode
    ).candidates
    //console.log('createServer onCompletion returns: ',candidates)
    logger.info('createServer onCompletion returns: ' + JSON.stringify(candidates))
    if (logger.isDebugEnabled())
      logger.debug('onCompletion returns: ' + JSON.stringify(candidates))
    return candidates
  })

  connection.onCodeAction((params) => {
    const lintResult = cache.findLintCacheByRange(
      params.textDocument.uri,
      params.range
    )
    if (!lintResult) {
      return []
    }
    const document = documents.get(params.textDocument.uri)
    if (!document) {
      return []
    }
    const text = document.getText()
    if (!text) {
      return []
    }

    function toPosition(text: string, offset: number) {
      const lines = text.slice(0, offset).split('\n')
      return Position.create(lines.length - 1, lines[lines.length - 1].length)
    }
    const fixes = Array.isArray(lintResult.lint.fix)
      ? lintResult.lint.fix
      : [lintResult.lint.fix]
    if (fixes.length === 0) {
      return []
    }
    const action = CodeAction.create(
      `fix: ${lintResult.diagnostic.message}`,
      {
        documentChanges: [
          TextDocumentEdit.create(
            { uri: params.textDocument.uri, version: document.version },
            fixes.map((v) => {
              const edit =
                v.range.startOffset === v.range.endOffset
                  ? TextEdit.insert(
                      toPosition(text, v.range.startOffset),
                      v.text
                    )
                  : TextEdit.replace(
                      {
                        start: toPosition(text, v.range.startOffset),
                        end: toPosition(text, v.range.endOffset),
                      },
                      v.text
                    )
              return edit
            })
          ),
        ],
      },
      CodeActionKind.QuickFix
    )
    action.diagnostics = params.context.diagnostics
    return [action]
  })

  connection.onCompletionResolve(async (item: CompletionItem): CompletionItem => {
    if(item.label.indexOf(TRIGGER_CHARATER) != -1){
       let table_info = item.label.split(TRIGGER_CHARATER)
       console.log("cache_table.includes(item.label)",cache_tables.includes(item.label),item.label)
       if(cache_tables.includes(item.label)){
           return item
       }
       let colums =  await getTableColums(item.label)
       schema.tables.forEach(x=>{
          if(x.database==table_info[0]&&x.tableName==table_info[1]){
             x.columns = colums.columns
          }
       });
       map_schema[global.ticketId] = schema
       cache_tables.push(item.label)
    }
    return item
  })

  connection.onExecuteCommand((request) => {
    logger.debug(
      `received executeCommand request: ${request.command}, ${request.arguments}`
    )
    if (
      request.command === 'switchDatabaseConnection' ||
      request.command === 'sqlLanguageServer.switchDatabaseConnection'
    ) {
      try {
        SettingStore.getInstance().changeConnection(
          (request.arguments && request.arguments[0]?.toString()) || ''
        )
      } catch (e) {
        const err = e as NodeJS.ErrnoException
        connection.sendNotification('sqlLanguageServer.error', {
          message: err.message,
        })
      }
    } else if (
      request.command === 'fixAllFixableProblems' ||
      request.command === 'sqlLanguageServer.fixAllFixableProblems'
    ) {
      const uri = request.arguments ? request.arguments[0] : null
      if (!uri) {
        connection.sendNotification('sqlLanguageServer.error', {
          message: 'fixAllFixableProblems: Need to specify uri',
        })
        return
      }
      const document = documents.get(uri.toString())
      const text = document?.getText()
      if (!text) {
        logger.debug('Failed to get text')
        return
      }
      const result: LintResult[] = JSON.parse(
        lint({ formatType: 'json', text, fix: true })
      )
      if (result.length === 0 && result[0].fixedText) {
        logger.debug("There's no fixable problems")
        return
      }
      logger.debug('Fix all fixable problems', text, result[0].fixedText)
      connection.workspace.applyEdit({
        documentChanges: [
          TextDocumentEdit.create(
            { uri: uri.toString(), version: document!.version },
            [
              TextEdit.replace(
                {
                  start: Position.create(0, 0),
                  end: Position.create(Number.MAX_VALUE, Number.MAX_VALUE),
                },
                result[0].fixedText!
              ),
            ]
          ),
        ],
      })
    }
  })

  connection.listen()
  logger.info('start sql-languager-server')
  return connection
}

export function createServer(
  params: { method?: ConnectionMethod; cookie?: string; debug?: boolean } = {}
) {
  const connection: Connection = createConnection(params.method ?? 'node-ipc')
  return createServerWithConnection(connection, params.cookie || '', params.debug)
}

function absolveCookies(cookie:string){
  var regExp_user_ticket_id = "(?<=linkis_user_session_ticket_id_v1=)[^;]+";
  var linkis_user_session_ticket_id_v1 = cookie.match(regExp_user_ticket_id)||[];
  global.ticketId = linkis_user_session_ticket_id_v1[0]
  //console.log("global.ticketId:",cookie,linkis_user_session_ticket_id_v1)
}

async function getTableColums(insertTable:string):ColumsInfo[]{
   console.log("call function getTableColums...")
   let table_info = insertTable.split(".")
   console.log("table_info:",table_info)
   var body = await syncBody('http://127.0.0.1:8088/api/rest_j/v1/datasource/columns?database='+table_info[0]+'&table='+table_info[1]);
   if(+body.status===0){
      console.log("call linkis method /api/rest_j/v1/datasource/columns?database="+table_info[0]+'&table='+table_info[1]+"success!")
   }else{
      console.log(body.message)
   }
   //console.log("request linkis getColums=====>",body.data)
   return body.data
}
