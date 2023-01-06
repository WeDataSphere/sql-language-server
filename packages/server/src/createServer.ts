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
import { Schema,RawField,Column } from './database_libs/AbstractClient'
import getDatabaseClient from './database_libs/getDatabaseClient'
import initializeLogging from './initializeLogging'
import { RequireSqlite3Error } from './database_libs/Sqlite3Client'
import { syncBody } from './database_libs/CommonUtils'
import { fileExists, readFile } from '../../sqlint/src/cli/utils'
import { CompletionItemTag } from 'vscode-languageserver-types'

export type ConnectionMethod = 'node-ipc' | 'stdio'

const TRIGGER_CHARATER = '.'
const insertTable = ''
//let map_schema={tables: [], functions: [], association: ""}
let map_schema={}
let cache_tables=[]
let cache_db = []
let set_tables = new Set()
//let map_association_catch = {tables: [], functions: [], association: ""}
let map_association_catch = {}
let map_operate = {}

const envConfig = require("../../../env.json")
Object.assign(process.env,envConfig)

export const map_colums={}
//let schema: Schema = { tables: [], functions: [] , association: ""}

export type ColumsInfo = {
  columnComment: string | null
  columnName: string
  columnType: string
}

type TimingConfig = {
  interval: number
  time: string
}

type SchemaInfo = {
  dbCapacity: string
  dbName: string
  dbSize: string
  description: string
  tableQuantity: string
}

type ColumField = {
  columnName: string
  columnType: string
  columnComment: string
  partitioned: string
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
  //var regExp_user_ticket_id = "(?<=linkis_user_session_ticket_id_v1=)[^;]+";
  //var linkis_user_session_ticket_id_v1 = dss_cookie.match(regExp_user_ticket_id)||[];
  //var ticketId = linkis_user_session_ticket_id_v1[0]
  var ticketId = dss_cookie
  //console.log("ticketId:",ticketId)

  //absolveCookies(dss_cookie)
  //console.log("createServerWithConnection cookie:",dss_cookie)
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
    //logger.debug("create server makeDiagnostics textDocument:",document.getText())
    const hasRules =
      !!lintConfig && Object.prototype.hasOwnProperty.call(lintConfig, 'rules')
    const diagnostics = createDiagnostics(
      document.uri,
      document.getText(),
      hasRules ? lintConfig : null
    )
    //console.log("create server makeDiagnostics diagnostics:",diagnostics)
    connection.sendDiagnostics(diagnostics)
  }

  async function getTableColums(db:string,table:string):ColumsInfo[]{
   logger.info("call function getTableColums...")
   var body = await syncBody(process.env.linkis_addr + '/api/rest_j/v1/datasource/columns?database=' + db + '&table=' + table,'GET',dss_cookie);
   if(+body.status===0){
      logger.info("call linkis method /api/rest_j/v1/datasource/columns?database=" + db + '&table=' + table + " success!")
   }else{
      logger.info(body.message)
   }
   logger.info("request linkis getColums=====>",body.data)
   return body.data
  }

  async function getSchemaBaseInfo(dbName:string):SchemaInfo{
    logger.info("call function getSchemaBaseInfo...")
    var body = await syncBody(process.env.linkis_addr + '/api/rest_j/v1/dss/datapipe/datasource/getSchemaBaseInfo?dbName=' + dbName,'GET',dss_cookie);
    if(+body.status===0){
       logger.info("call linkis method /api/rest_j/v1/dss/datapipe/datasource/getSchemaBaseInfo?dbName=" + dbName + " success!")
    }else{
       logger.info(body.message)
    }
    logger.info("request linkis getSchemaBaseInfo=====>",body.data)
    return body.data
   }

  documents.onDidChangeContent(async (params) => {
    logger.debug(
      `onDidChangeContent: ${params.document.uri}, ${params.document.version}`
    )
    //let docText = params.document.getText()
    //if(docText.includes(";")){
    //  let textTrim = docText.trim()
    //  let textArray = textTrim.split(";")
    //  if(textTrim.endsWith(";")){
    //     params.document._content = textArray[textArray.length-2]
    //  }else{
    //     params.document._content = textArray[textArray.length-1]
    //  }
    //}
    makeDiagnostics(params.document)
  })

  connection.onInitialize((params): InitializeResult => {
    //console.log("onInitialize params:",JSON.stringify(params))
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
         logger.info("call connection.onInitialized ========>>>>>")
         //console.log("get schema",JSON.stringify(schema))
         logger.info("user if ticketId:",ticketId)
         logger.info("connection.onInitialized map_schema:",Object.keys(map_schema))
         if(!Object.keys(map_schema).includes(ticketId)){
            logger.info("process in call get schema")
            //console.log("process in call get schema")
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
    logger.info("-----------connection onCompletion-------------")
    if (
      docParams.context?.triggerKind == CompletionTriggerKind.TriggerCharacter
    ) {
      if (docParams.context?.triggerCharacter != TRIGGER_CHARATER) {
        return []
      }
    }
    //logger.info("createServer onCompletion docParams:",docParams)
    let text = documents.get(docParams.textDocument.uri)?.getText()
    if (!text) {
      return []
    }
    logger.debug(text || '')
    const pos = {
      line: docParams.position.line,
      //line: 0,
      column: docParams.position.character,
    }
    const setting = SettingStore.getInstance().getSetting()
    if(typeof(map_schema[ticketId]) === 'undefined' || typeof(map_association_catch[ticketId]) === 'undefined'){
       map_schema[ticketId] = {"tables":[],"functions":[],"association":""}
       map_association_catch[ticketId] = {"tables":[],"functions":[],"association":""}
    }
    //console.log(map_schema[ticketId])
    if(map_schema[ticketId] && map_schema[ticketId].association === 'close' && Object.keys(map_schema[ticketId].tables).length > 0){
       //console.log("into close map_schema[global.ticketId]:",map_schema[global.ticketId])
       map_association_catch[ticketId] = map_schema[ticketId]
       map_schema[ticketId] = {tables: [], functions: [],association: "close"}
    }else if(map_schema[ticketId] && map_schema[ticketId].association === 'open' && Object.keys(map_association_catch[ticketId].tables).length > 0){
       //console.log("into open map_association_catch[global.ticketId]:",map_association_catch[global.ticketId])
       map_schema[ticketId] = map_association_catch[ticketId]
       //console.log("into open map_schema[ticketId].association:",map_schema[ticketId].association)
    }
     let textArray = []
     if(text.includes(";")){
       let textTrim = text.trim()
       textArray = textTrim.split(";")
       if(textTrim.endsWith(";")){
         logger.info("end with ';':",textArray.length)
         text = textArray[textArray.length-2]
       }else{
         logger.info("with no :",textArray.length)
         text = textArray[textArray.length-1]
       }
    }
    //console.log("connection.onCompletion text:",text)
 
    const candidates = complete(
      text,
      pos,
      map_schema[ticketId],
      setting.jupyterLabMode
    ).candidates
   //candidates.sort(objectArraySort('detail'))
   //console.log(candidates) 
   let new_candidates
   if(candidates.length > 200){
     new_candidates = {
       isIncomplete : true,
       items : candidates.slice(0,200)
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
    console.log('onCompletionResolve:',item)
    //kind=10为udf函数
    if(item.kind === 10){
      if(item.documentation === '过期函数')
        item.tags = [1]
    }
    //kind = 4 载入库信息
    if(item.kind ===4){
      let dbName = item.label.trim()
      //检查缓存
      if(cache_db[ticketId] === void 0) cache_db[ticketId] = []
      if(cache_db[ticketId].includes(dbName)){
        return item
      }
      cache_db[ticketId].push(dbName)
      //调用api/rest_j/v1/dss/datapipe/datasource/getSchemaBaseInfo?dbName=bdp_dqm_tmp_db
      let schemaInfo = await getSchemaBaseInfo(dbName)
      item.documentation = 
        ' 库名：' + dbName + 
        '\r\n 库大小：' + schemaInfo.schemaInfo.dbSize + 
        '\r\n 库配额：' + schemaInfo.schemaInfo.dbCapacity + 
        '\r\n 表数量：' + schemaInfo.schemaInfo.tableQuantity + 
        '\r\n 备注：' + schemaInfo.schemaInfo.description
    }
    //联想表kind=5
    if(item.kind === 5){
       let table = item.label
       let db = item.detail.trim()
       //检查缓存
       if(cache_tables[ticketId] === void 0) cache_tables[ticketId] = []
       if(cache_tables[ticketId].includes(db + '.' + table)){
           return item
       }
       //调用接口获取字段数据
       let colums =  await getTableColums(db,table)
       //组装字段
       map_schema[ticketId].tables.forEach(x=>{
          if(x.database==db&&x.tableName==table){
             x.columns = colums.columns
          }
       });
       //缓存
       cache_tables[ticketId].push(db + '.' + table)
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
      logger.info("change association",operate)
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
      //console.log("fix request:",request.arguments)
      const document = documents.get(uri.toString())
      const text = document?.getText()
      //console.log("fix documents:",documents)
      if (!text) {
        logger.debug('Failed to get text')
        return
      }
      const result: LintResult[] = JSON.parse(
        lint({ formatType: 'json', text, fix: true })
      )
      //console.log("fix problems result:",result)
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

function objectArraySort(keyName:string) {
  return function (objectN, objectM) {
    var valueN = objectN[keyName]
    var valueM = objectM[keyName]
    if (valueN > valueM) return 1
    else if (valueN < valueM) return -1
    else return 0
  }
}

function absolveCookies(cookie:string){
  var regExp_user_ticket_id = "(?<=linkis_user_session_ticket_id_v1=)[^;]+";
  var linkis_user_session_ticket_id_v1 = cookie.match(regExp_user_ticket_id)||[];
  global.ticketId = linkis_user_session_ticket_id_v1[0]
  //console.log("global.ticketId:",cookie,linkis_user_session_ticket_id_v1)
}

//定时任务，定时清理schema缓存
const timeoutFunc =(config, func) =>{
  console.log("定时任务执行中。。。")
  const nowTime = new Date().getTime()
  const timePoints = process.env.timing_time.split(':').map(i => parseInt(i))
  let recent = new Date().setHours(...timePoints)
  recent >= nowTime || (recent += 24 * 3600000)
  console.log("recent - nowTime:",recent - nowTime)
  setTimeout(() => {
    func()
    setInterval(func, process.env.timing_interval * 3600000 * 24)
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

