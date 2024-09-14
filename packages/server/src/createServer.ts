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
import { getTableColums,getSchemaBaseInfo,readPropertiesFile } from './database_libs/RequestApi'
import { getRidOfAfterPosString2 } from './complete/StringUtils'

export type ConnectionMethod = 'node-ipc' | 'stdio'

const logger = log4js.getLogger()

const TRIGGER_CHARATER = '.'
let map_schema:any={}
let cache_tables:any[]=[]
let map_association_catch:any = {}

const parser_enable = readPropertiesFile('parser_enable');
logger.info("read params: parser_enable ", parser_enable)

export const map_colums={}

const config = {//参数的说明
  interval: 0, //间隔天数，间隔为整数
  time: "1:00:00" //执行的时间点 时在0~23之间
}

export function createServerWithConnection(
  connection: Connection,
  dss_cookie: string,
  debug = false
) {
  var ticketId = dss_cookie
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

  documents.onDidChangeContent(async (params) => {
    logger.debug(
      `onDidChangeContent: ${params.document.uri}, ${params.document.version}`
    )
    if(parser_enable)
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
         logger.info("user if ticketId:",ticketId)
         logger.info("connection.onInitialized map_schema:",Object.keys(map_schema))
         if(!Object.keys(map_schema).includes(ticketId)){
            logger.info("process in call get schema")
            map_schema[ticketId] = await client.getSchema(dss_cookie)
         }
       } catch (e) {
         logger.error('failed to get schema info')
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
//      let textArray = []
//      if(text.includes(";")){
//        let textTrim = text.trim()
//        textArray = textTrim.split(";")
//        if(textTrim.endsWith(";")){
//          logger.info("end with ';':",textArray.length)
//          text = textArray[textArray.length-2]
//        }else{
//          logger.info("with no :",textArray.length)
//          text = textArray[textArray.length-1]
//        }
//     }

    //重新定位光标
    let target = getRidOfAfterPosString2(text, pos)
    if(target && target.indexOf(';')>0){

      let sqlArray: string[]

      sqlArray = target.trim().split(';')
      target = target && sqlArray.pop() || ''

      const newLineRegex = /\r\n|\n|\r/g;
      let preSql = sqlArray.join(";")
      text = target

      let line = (preSql.match(newLineRegex) || []).length
      pos.line = pos.line - line >=0 ? pos.line - line : 0

      if(text.startsWith("\n")) {
        let matchLength = (text.match(/^[\r\n]+/) || '')[0].length
        pos.line = pos.line-matchLength
        text = text.replace(/^\n*/, '')
      }else if(pos.line === 0){
        let preLength = 0
        const lastNewLineIndex = preSql.lastIndexOf('\n');
        if (lastNewLineIndex === -1) {
          preLength = preSql.length;
        } else {
          preLength = preSql.length - lastNewLineIndex - 1; // 减去换行符本身的长度1
        }
        pos.column = pos.column - preLength -1 >=0 ? pos.column - preLength -1 : 0
      }
      logger.info(`newTestAndPos : test:${text} ; pos : ${JSON.stringify(pos)}`)
    }

    const candidates = complete(
      text,
      pos,
      map_schema[ticketId],
      setting.jupyterLabMode
    ).candidates

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

  connection.onCompletionResolve(async (item: CompletionItem): Promise<CompletionItem> => {
    if(item.kind === 10 && item.documentation === "过期函数") item.tags = [1]
    //kind=22为基础函数
    if(item.kind === 22)
      item.documentation = {kind:'markdown',value:item.documentation.value}
    //kind = 4 载入库信息
    if(item.kind ===4){
      let dbName = item.label.trim()
      //调用api/rest_j/v1/dss/datapipe/datasource/getSchemaBaseInfo?dbName=bdp_dqm_tmp_db
      let schemaInfo = await getSchemaBaseInfo(dbName, ticketId)
      //console.log("schemaInfo:",schemaInfo)
      if (schemaInfo != void 0)
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
       //console.log("cache_tables:",cache_tables[ticketId])
       if(cache_tables[ticketId] === void 0) cache_tables[ticketId] = []
       if(cache_tables[ticketId].includes(db + '.' + table)){
           return item
       }
       //调用接口获取字段数据
       let colums =  await getTableColums(db,table,ticketId)
       //组装字段
       map_schema[ticketId].tables.forEach(x=>{
          if(x.database==db&&x.tableName==table){
             x.columns = colums.columns
          }
       });
       //缓存
       cache_tables[ticketId].push(db + '.' + table)
    }
    logger.info('onCompletionResolve:',item)
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
  //initializeLogging(false)
  logger.info("server begin to launch")
  const connection: Connection = createConnection(params.method ?? 'node-ipc')
  return createServerWithConnection(connection, params.cookie || '', params.debug)
}

//清理缓存
export function cleanCache(dss_cookie:string){
  logger.error("-----------------------------------开始清理缓存--------------------------------------")
  var ticketId = dss_cookie
  try {
    setTimeout(() => {
      delete map_schema[ticketId]
      delete cache_tables[ticketId]
      delete map_association_catch[ticketId]
      logger.info("map_schema:",map_schema)
      logger.info("cache_tables:",cache_tables)
      logger.info("=============================================")
    }, 3600000)
  } catch (error) {
    logger.error("清理缓存执行异常：", error);
  }
}


//定时任务，定时清理schema缓存
const timeoutFunc =(config, func) =>{
  initializeLogging(false)
  logger.info("定时任务执行中。。。")
  const nowTime = new Date().getTime()
  const timePoints = readPropertiesFile('timing_time').split(':').map(i => parseInt(i))
  let recent = new Date().setHours(...timePoints)
  recent >= nowTime || (recent += 24 * 3600000)
  logger.info("recent - nowTime:",recent - nowTime)
  try {
    setTimeout(() => {
      func()
      const client = getDatabaseClient()
      setInterval(func, readPropertiesFile('timing_interval') * 3600000 * 24)
      logger.info("===========定时任务执行成功==================")
      client.basesNumberInit()
      logger.info("map_schema:",map_schema)
      logger.info("cache_tables:",cache_tables)
      logger.info("=============================================")
    }, recent - nowTime)
  } catch (error) {
    logger.error("定时任务执行异常：", error);
  }
}

timeoutFunc(config,()=>{
  map_schema = {}
  cache_tables=[]
  map_association_catch = {}
  logger.info("===========定时任务执行成功==================")
      const client = getDatabaseClient()
      client.basesNumberInit()
      logger.info("map_schema:",map_schema)
      logger.info("cache_tables:",cache_tables)
      logger.info("map_association_catch:",cache_tables)
      logger.info("=============================================")
})

