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
import { fileExists, readFile } from '../../sqlint/src/cli/utils'
import { createCandidatesForColumnsOfAnyTable } from 'sql-language-server'

export type ConnectionMethod = 'node-ipc' | 'stdio'

const TRIGGER_CHARATER = '.'
let map_schema={}
let cache_tables=[]
let map_association_catch = {}

export const map_colums={}

export type ColumsInfo = {
  columnComment: string | null
  columnName: string
  columnType: string
}

type TimingConfig = {
  interval: number
  time: string
}

const config = {//参数的说明
  interval: 0, //间隔天数，间隔为整数
  time: "1:00:00" //执行的时间点 时在0~23之间
}

export function createServerWithConnection(
  connection: Connection,
  dss_cookie: string,
  debug = false
) {
  initializeLogging(debug)
  //赋值cookie到全局变量
  //global.cookies=dss_cookie
  var regExp_user_ticket_id = "(?<=linkis_user_session_ticket_id_v1=)[^;]+";
  var linkis_user_session_ticket_id_v1 = dss_cookie.match(regExp_user_ticket_id)||[];
  var ticketId = linkis_user_session_ticket_id_v1[0]

  const logger = log4js.getLogger()
  const documents = new TextDocuments(TextDocument)
  documents.listen(connection)
  let hasConfigurationCapability = false
  let rootPath = ''
  let lintConfig: RawConfig | null | undefined

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

  async function getTableColums(insertTable:string):Promise<ColumsInfo[]>{
   let table_info = insertTable.split(".")
   var body = await syncBody('http://127.0.0.1:8088/api/rest_j/v1/datasource/columns?database='+table_info[0]+'&table='+table_info[1],'GET',dss_cookie);
   if(+body.status===0){
      console.log("call linkis method /api/rest_j/v1/datasource/columns?database="+table_info[0]+'&table='+table_info[1]+"success!")
   }else{
      console.log(body.message)
   }
   console.log("request linkis getColums=====>",body.data)
   return body.data
  }

  documents.onDidChangeContent(async (params) => {
    logger.debug(
      `onDidChangeContent: ${params.document.uri}, ${params.document.version}`
    )
    // let docText = params.document.getText()
    // if(docText.includes(";")){
    //   let textTrim = docText.trim()
    //   let textArray = textTrim.split(";")
    //   if(textTrim.endsWith(";")){
    //      params.document._content = textArray[textArray.length-2]
    //   }else{
    //      params.document._content = textArray[textArray.length-1]
    //   }
    // }
    // const pos = {
    //   line: params.document._content.split("/n")-1,
    //   column: params.document._content.length,
    // }
    // const candidates = complete(
    //   params.document._content,
    //   pos,
    //   map_schema[ticketId],
    //   false
    // ).candidates
    //return candidates
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

    //logger.debug(`onInitialize: ${params.rootPath}`)
    rootPath = params.rootPath || ''

    return {
      capabilities: {
        textDocumentSync: 1,
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: [TRIGGER_CHARATER],
        },
        renameProvider: false,
        codeActionProvider: false,
        executeCommandProvider: {
          commands: [
            'sqlLanguageServer.changeAssociation'
          ],
        },
      },
    }
  })

  connection.onInitialized(async () => {
    try {
         const client = getDatabaseClient()
         console.log("call connection.onInitialized ========>>>>>")
         console.log(Object.keys(map_schema))
         if(!Object.keys(map_schema).includes(ticketId)){
            map_schema[ticketId] = await client.getSchema(dss_cookie)
         }
         map_association_catch[ticketId] = map_schema[ticketId]
       } catch (e) {
         logger.error('failed to get schema info')
         if (e instanceof RequireSqlite3Error) {
           connection.sendNotification('sqlLanguageServer.error', {
             message: 'Need to rebuild sqlite3 module.',
           })
         }
           throw e
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
    console.log("-----------connection onCompletion-------------")
    // Make sure the client does not send use completion request for characters
    // other than the dot which we asked for.
    if (
      docParams.context?.triggerKind == CompletionTriggerKind.TriggerCharacter
    ) {
      if (docParams.context?.triggerCharacter != TRIGGER_CHARATER) {
        return []
      }
    }
    let text = documents.get(docParams.textDocument.uri)?.getText()
    if (!text) {
      return []
    }
    logger.debug(text || '')
    const pos = {
      line: docParams.position.line,
      column: docParams.position.character,
    }
    const setting = SettingStore.getInstance().getSetting()
    if(typeof(map_schema[ticketId]) === 'undefined' || typeof(map_association_catch[ticketId]) === 'undefined'){
       map_schema[ticketId] = {"tables":[],"functions":[],"association":""}
       map_association_catch[ticketId] = {"tables":[],"functions":[],"association":""}
    }
    if(map_schema[ticketId] && map_schema[ticketId].association === 'close' && Object.keys(map_schema[ticketId].tables).length > 0){
       map_association_catch[ticketId] = map_schema[ticketId]
       map_schema[ticketId] = {tables: [], functions: [],association: "close"}
    }else if(map_schema[ticketId] && map_schema[ticketId].association === 'open' && Object.keys(map_association_catch[ticketId].tables).length > 0){
       map_schema[ticketId] = map_association_catch[ticketId]
       console.log("into open map_schema[ticketId].association:",map_schema[ticketId].association)
    }
    // let textArray = []
    // if(text.includes(";")){
    //   let textTrim = text.trim()
    //   textArray = textTrim.split(";")
    //   if(textTrim.endsWith(";")){
    //     console.log("end with ';':",textArray.length)
    //     text = textArray[textArray.length-2]
    //   }else{
    //     console.log("with no :",textArray.length)
    //     text = textArray[textArray.length-1]
    //   }
    // }
    // console.log("text:",text)
    const candidates = complete(
      text,
      pos,
      map_schema[ticketId],
      setting.jupyterLabMode
    ).candidates

    let new_candidates: any
    if(candidates.length > 200){
      new_candidates = {
        isIncomplete : true,
        items : candidates
      }
      return new_candidates
    }
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
    //console.log("on completion resolve item:",item)
    if(item.label.indexOf(TRIGGER_CHARATER) != -1){
       let table_info = item.label.split(".")
       console.log("cache_table.includes(item.label)",cache_tables.includes(item.label),item.label)
       if(cache_tables.includes(item.label)){
           return item
       }
       let colums =  await getTableColums(item.label)
       map_schema[ticketId].tables.forEach(x=>{
          if(x.database==table_info[0]&&x.tableName==table_info[1]){
             x.columns = colums.columns
          }
       });
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
      request.command === 'changeAssociation' ||
      request.command === 'sqlLanguageServer.changeAssociation'
    ){
      const operate = request.arguments ? request.arguments[0] : null
      console.log("change association",operate)
      if( operate === 'close'){
        map_schema[ticketId].association = 'close'
        map_association_catch[ticketId].association = 'close'
      } else {
        map_schema[ticketId].association = 'open'
        map_association_catch[ticketId].association = 'open'
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
      console.log("fix request:",request.arguments)
      const document = documents.get(uri.toString())
      const text = document?.getText()
      console.log("fix documents:",documents)
      if (!text) {
        logger.debug('Failed to get text')
        return
      }
      const result: LintResult[] = JSON.parse(
        lint({ formatType: 'json', text, fix: true })
      )
      console.log("fix problems result:",result)
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

//定时任务，定时清理schema缓存
const timeoutFunc =(config, func) =>{
  console.log("定时任务执行中。。。")
  let filePath = path.join(path.resolve(__dirname, '../../../'), 'timing.json')
  console.log("配置文件路径：",filePath)
  if(fileExists(filePath)){
    const fileContent = readFile(filePath)
    let timingconfig: TimingConfig
    timingconfig = JSON.parse(fileContent)
    config = timingconfig
    console.log("配置文件存在，读取配置文件配置信息：",config)
  }else{
    console.log("配置文件不存在,加载默认配置:",config)
  }
  const nowTime = new Date().getTime()
  const timePoints = config.time.split(':').map(i => parseInt(i))
  let recent = new Date().setHours(...timePoints)
  recent >= nowTime || (recent += 24 * 3600000)
  setTimeout(() => {
    func()
    setInterval(func, config.interval * 24 * 3600000)
    console.log("===========定时任务执行成功==================")
    console.log("map_schema:",map_schema)
    console.log("cache_tables:",cache_tables)
    console.log("=============================================")
  }, recent - nowTime)
}

timeoutFunc(config,()=>{
  map_schema = {}
  cache_tables=[]
})
