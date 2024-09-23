import {
  parse,
  parseFromClause,
  SelectStatement,
  FromTableNode,
  IncompleteSubqueryNode,
  FromClauseParserResult,
  DeleteStatement,
  ParseError,
  ExpectedLiteralNode,
  AST,
} from '@joe-re/sql-parser'
import log4js from 'log4js'
import { CompletionItem } from 'vscode-languageserver-types'
import { Schema, Table } from '../database_libs/AbstractClient'
import { getRidOfAfterPosString } from './StringUtils'
import { getLastToken } from './utils/getLastToken'
import {
  isPosInLocation,
  createTablesFromFromNodes,
  findColumnAtPosition,
  getAllNestedFromNodes,
  getNearestFromTableFromPos,
} from './AstUtils'
import { createBasicKeywordCandidates } from './candidates/createBasicKeywordCandidates'
import { createCusFunctionCandidates } from './candidates/createCusFunctionCandidates'
import { createHqlKeywordCandidates } from './candidates/createHqlKeywordCandidates'
import { createTableCandidates } from './candidates/createTableCandidates'
import { createDataBaseCandidates } from './candidates/createDataBaseCandidates'
import {createDbTableCandidates } from './candidates/createDbTableCandidates'
import { createJoinCondidates } from './candidates/createJoinCandidates'
import { createVariableCandidates } from './candidates/createVariableCandidates'
import {
  createCandidatesForColumnsOfAnyTable,
  createCandidatesForScopedColumns,
} from './candidates/createColumnCandidates'
import { createAliasCandidates } from './candidates/createAliasCandidates'
import { createSelectAllColumnsCandidates } from './candidates/createSelectAllColumnsCandidates'
import { createFunctionCandidates } from './candidates/createFunctionCandidates'
import { createKeywordCandidatesFromExpectedLiterals } from './candidates/createKeywordCandidatesFromExpectedLiterals'
import { createJoinTablesCandidates } from './candidates/createJoinTableCndidates'
import { createBaseColumnsCandidates } from './candidates/createBaseColumnsCandidates'
import { createDefinedGrammarCandidates } from './candidates/createDefinedGrammarCandidates'
import { ICONS, toCompletionItemForKeyword } from './CompletionItemUtils'
import { getTableColums } from '../database_libs/RequestApi'
import { isTableMatch } from './AstUtils'

export type Pos = { line: number; column: number }

const logger = log4js.getLogger()

function getFromNodesFromClause(sql: string): FromClauseParserResult | null {
  try {
    return parseFromClause(sql)
  } catch (_e) {
    // no-op
    return null
  }
}

type CompletionError = {
  label: string
  detail: string
  line: number
  offset: number
}
class Completer {
  lastToken = ''
  candidates: CompletionItem[] = []
  schema: Schema
  error: CompletionError | null = null
  sql: string
  pos: Pos
  isSpaceTriggerCharacter = false
  isDotTriggerCharacter = false
  jupyterLabMode: boolean
  ticketId: string

  constructor(schema: Schema, sql: string, pos: Pos, jupyterLabMode: boolean, ticketId:string) {
    this.schema = schema
    this.sql = sql
    this.pos = pos
    this.jupyterLabMode = jupyterLabMode
    this.ticketId = ticketId
  }

  complete() {
    //let target = getRidOfAfterPosString(this.sql, this.pos)
    let target = this.sql || ''
    //console.log("target:",target)
    this.lastToken = getLastToken(target)
    const idx = this.lastToken.lastIndexOf('.')
    this.isSpaceTriggerCharacter = this.lastToken === ''
    this.isDotTriggerCharacter =
      !this.isSpaceTriggerCharacter && idx == this.lastToken.length - 1

    const parsedFromClause2 = getFromNodesFromClause(this.sql)
    //初始化表字段
    if (parsedFromClause2) {
      const fromNodes1 = getAllNestedFromNodes(
        parsedFromClause2?.from?.tables || []
      )
      fromNodes1
      .flatMap((fromNode) => {
        this.schema.tables
        .filter((table) => isTableMatch(fromNode, table))
        .flatMap((table) =>{
          logger.info(`colums:${table.columns}`)
          if(!table.columns){
            getTableColums(table.database||'',table.tableName,this.ticketId).then(res=>{table.columns = res.columns })
          }
          logger.info(`colums:${table.columns}`)
        })
      })
    }

    try {
      const ast = parse(target)
      logger.debug("after parse target:",ast)
      this.addCandidatesForParsedStatement(ast)
    } catch (_e: unknown) {
      logger.debug(_e.toString().split("at")[0])
      if (!(_e instanceof Error)) {
        throw _e
      }
      if (_e.name !== 'SyntaxError') {
        throw _e
      }
      const e = _e as ParseError
      const parsedFromClause = getFromNodesFromClause(this.sql)
      logger.info("e.message:",e.message)
      if (parsedFromClause) {
        const fromNodes = getAllNestedFromNodes(
          parsedFromClause?.from?.tables || []
        )
        const fromNodeOnCursor = getNearestFromTableFromPos(fromNodes, this.pos)
        if (
          fromNodeOnCursor &&
          fromNodeOnCursor.type === 'incomplete_subquery'
        ) {
          // Incomplete sub query 'SELECT sub FROM (SELECT e. FROM employees e) sub'
          this.addCandidatesForIncompleteSubquery(fromNodeOnCursor)
        } else {
          this.addCandidatesForSelectQuery(e, fromNodes)
          const expectedLiteralNodes =
            e.expected?.filter(
              (v): v is ExpectedLiteralNode => v.type === 'literal'
            ) || []
          this.addCandidatesForJoins(expectedLiteralNodes, fromNodes)
        }
      }
      //else if (this.sql.trim().toLowerCase().startsWith('insert into')){
      else if (e.message === 'EXPECTED COLUMN NAME') {
        logger.debug("EXPECTED COLUMN NAME for insert")
        let sqlArry = this.sql.split(" ").filter(i=> i)
        //console.log("insert tableName:",sqlArry[2])
        this.addCandidatesForInsert(sqlArry[2])
      }
      else if (this.sql.trim().toLowerCase().startsWith('use')){
        this.addCandidatesForDbs(this.schema.tables, false)
      } else if (this.sql.replace(/\s*/g, "").startsWith("insertinto") && !this.sql.includes(")")){
        this.addCandidatesForDbs(this.schema.tables, false)
        this.addCandidatesForTables(this.schema.tables, false)
      } else {
        this.addCandidatesForError(e)
      }
      this.error = {
        label: e.name,
        detail: e.message,
        line: e.location.start.line,
        offset: e.location.start.offset,
      }
    }
    return this.candidates
  }

  addCandidatesForBasicKeyword() {
    createBasicKeywordCandidates().forEach((v) => {
      this.addCandidate(v)
    })
  }

  addCandidatesForExpectedLiterals(expected: ExpectedLiteralNode[]) {
    //logger.info("=====into addCandidatesForExpectedLiterals=====")
    createKeywordCandidatesFromExpectedLiterals(expected).forEach((v) => {
      this.addCandidate(v)
    })
  }

  addCandidate(item: CompletionItem) {
    // A keyword completion can be occured anyplace and need to suppress them.
    if (
      item.kind &&
      item.kind === ICONS.KEYWORD &&
      !item.label.toUpperCase().startsWith(this.lastToken) &&
      !item.label.toLowerCase().startsWith(this.lastToken)
    ) {
      return
    } else {
      const replaceWords = item.label
      // lower case
      if (this.lastToken>='a' && this.lastToken<='z') {
         if (replaceWords.indexOf(item.label) > -1) {
            item.label = item.label.toLowerCase()
         }
      }
    }

    //关键字优先联想
    if (item.kind === 10){
       item.sortText = 'b'
    }

    // JupyterLab requires the dot or space character preceeding the <tab> key pressed
    // If the dot or space character are not added to the label then searching
    // in the list of suggestion does not work.
    // Here we fix this issue by adding the dot or space character
    // to the filterText and insertText.
    // TODO: report this issue to JupyterLab-LSP project.
    if (this.jupyterLabMode) {
      const text = item.insertText || item.label
      if (this.isSpaceTriggerCharacter) {
        item.insertText = ' ' + text
        item.filterText = ' ' + text
      } else if (this.isDotTriggerCharacter) {
        item.insertText = '.' + text
        item.filterText = '.' + text
      }
    }
    this.candidates.push(item)
  }

  addCandidatesForTables(tables: Table[], onFromClause: boolean) {
    //logger.info("=====into addCandidatesForTables=====")
    createTableCandidates(tables, this.lastToken, onFromClause).forEach(
      (item) => {
        this.addCandidate(item)
      }
    )
  }

  addCandidatesForDbs(tables: Table[], onFromClause: boolean) {
    //logger.info("=====into addCandidatesForDbs=====")
    createDataBaseCandidates(tables, this.lastToken, onFromClause).forEach(
      (item) => {
        this.addCandidate(item)
      }
    )
  }

  addCandidatesForDbTables(tables: Table[], onFromClause: boolean) {
    //logger.info("=====into addCandidatesForDbTables=====")
    createDbTableCandidates(tables, this.lastToken, onFromClause).forEach(
      (item) => {
        this.addCandidate(item)
      }
    )
  }

  addCandidatesForColumnsOfAnyTable(tables: Table[],tableName:string) {
    //logger.info("=====into addCandidatesForColumnsOfAnyTable=====")
    createCandidatesForColumnsOfAnyTable(tables, this.lastToken, tableName).forEach(
      (item) => {
        this.addCandidate(item)
      }
    )
  }

  addCandidatesForIncompleteSubquery(
    incompleteSubquery: IncompleteSubqueryNode
  ) {
    //logger.info("=====addCandidatesForIncompleteSubquery=====")
    const parsedFromClause = getFromNodesFromClause(incompleteSubquery.text)
    try {
      parse(incompleteSubquery.text)
    } catch (e: unknown) {
      if (!(e instanceof Error)) {
        throw e
      }
      if (e.name !== 'SyntaxError') {
        throw e
      }
      const fromText = incompleteSubquery.text
      const newPos = parsedFromClause
        ? {
            line: this.pos.line - (incompleteSubquery.location.start.line - 1),
            column:
              this.pos.column - incompleteSubquery.location.start.column + 1,
          }
        : { line: 0, column: 0 }
      const completer = new Completer(
        this.schema,
        fromText,
        newPos,
        this.jupyterLabMode,
        this.ticketId
      )
      completer.complete().forEach((item) => this.addCandidate(item))
    }
  }

  /**
   * INSERT INTO TABLE1 (C
   */
  addCandidatesForInsert(tableName: string) {
    //logger.info("=====into addCandidatesForInsert=====")
    this.addCandidatesForColumnsOfAnyTable(this.schema.tables,tableName)
    //this.addCandidatesForDbTables(this.schema.tables, false)
    //this.addCandidatesForTables(this.schema.tables, false)
  }

  addCandidatesForError(e: ParseError) {
    logger.debug("*****oncomplete addCandidatesForError*****")
    const expectedLiteralNodes =
      e.expected?.filter(
        (v): v is ExpectedLiteralNode => v.type === 'literal'
      ) || []
    this.addCandidatesForExpectedLiterals(expectedLiteralNodes)
    this.addCandidatesForFunctions()
    this.addCandidatesForCusFunction()
    this.addDefinedGrammarCandidates()
    this.addCandidatesForHqlKeyword()
    this.addBaseColumnsCandidates()
    this.addCandidatesForVariable()
    //this.addCandidatesForBasicKeyword()
    this.addCandidatesForDbs(this.schema.tables, false)
    this.addCandidatesForTables(this.schema.tables, false)
  }

  addCandidatesForSelectQuery(e: ParseError, fromNodes: FromTableNode[]) {
    logger.debug("*****oncomplete addCandidatesForSelectQuery*****")
    const subqueryTables = createTablesFromFromNodes(fromNodes)
    const schemaAndSubqueries = this.schema.tables.concat(subqueryTables)
    this.addCandidatesForSelectStar(fromNodes, schemaAndSubqueries)
    const expectedLiteralNodes =
      e.expected?.filter(
        (v): v is ExpectedLiteralNode => v.type === 'literal'
      ) || []
    this.addCandidatesForExpectedLiterals(expectedLiteralNodes)
    this.addCandidatesForScopedColumns(fromNodes, schemaAndSubqueries)
    this.addCandidatesForBasicKeyword()
    //this.addCandidatesForCusFunction()
    this.addCandidatesForAliases(fromNodes)
    this.addCandidatesForDbs(this.schema.tables, false)
    this.addCandidatesForTables(schemaAndSubqueries, true)
    //this.addBaseColumnsCandidates()
    //if (logger.isDebugEnabled())
    //  logger.debug(
    //    `candidates for error returns: ${JSON.stringify(this.candidates)}`
    //  )
  }

  addCandidatesForJoins(
    expected: ExpectedLiteralNode[],
    fromNodes: FromTableNode[]
  ) {
    //logger.info("=====addCandidatesForJoins=====")
    createJoinTablesCandidates(
      this.schema.tables,
      expected,
      fromNodes,
      this.lastToken
    ).forEach((v) => {
      this.addCandidate(v)
    })
  }

  addCandidatesForParsedDeleteStatement(ast: DeleteStatement) {
    logger.info("*****addCandidatesForParsedDeleteStatement*****")
    //console.log("isPosInLocation:",isPosInLocation(ast.table.location, this.pos))
    //console.log("ast.table.location:",ast.table.location)
    //console.log("this.pos:",this.pos)
   // if (isPosInLocation(ast.table.location, this.pos)) {
    if (ast.type === 'delete'){
      this.addCandidatesForDbs(this.schema.tables, false)
      this.addCandidatesForTables(this.schema.tables, false)
    } else if (
      ast.where &&
      isPosInLocation(ast.where.expression.location, this.pos)
    ) {
      const expr = ast.where.expression
      let tableName = this.sql.split(" ")
      if (expr.type === 'column_ref') {
        this.addCandidatesForColumnsOfAnyTable(this.schema.tables,tableName[2])
      }
    }
  }

  addCandidatesForParsedSelectQuery(ast: SelectStatement) {
    //this.addCandidatesForBasicKeyword()
    logger.info("*****oncomplete addCandidatesForParsedSelectQuery*****")
    if (Array.isArray(ast.columns)) {
      //logger.debug("ast columns")
      this.addCandidate(toCompletionItemForKeyword('FROM'))
      this.addCandidate(toCompletionItemForKeyword('AS'))
    }
    if (!ast.distinct) {
      this.addCandidate(toCompletionItemForKeyword('DISTINCT'))
    }
    const columnRef = findColumnAtPosition(ast, this.pos)
    logger.info("addCandidatesForParsedSelectQuery columnRef:",columnRef)
    //const schemaAndSubqueries = this.schema.tables.concat(subqueryTables)
    this.addCandidatesForFunctions()
    this.addCandidatesForCusFunction()
    this.addCandidatesForHqlKeyword()
    this.addCandidatesForVariable()
    if (!columnRef) {
      logger.debug("!columnRef")
      this.addJoinCondidates(ast)
      this.addCandidatesForBasicKeyword()
    } else {
      const parsedFromClause = getFromNodesFromClause(this.sql)
      const fromNodes = parsedFromClause?.from?.tables || []
      const subqueryTables = createTablesFromFromNodes(fromNodes)
      const schemaAndSubqueries = this.schema.tables.concat(subqueryTables)
      if (columnRef.table) {
        //logger.debug("columnRef.table")
        // We know what table/alias this column belongs to
        // Find the corresponding table and suggest it's columns
        this.addCandidatesForScopedColumns(fromNodes, schemaAndSubqueries)
      } else {
        //logger.debug("columnRef.table else")
        // Column is not scoped to a table/alias yet
        // Could be an alias, a talbe or a function
        this.addCandidatesForAliases(fromNodes)
        //this.addCandidatesForFunctions()
        //this.addCandidatesForCusFunction()
        //this.addCandidatesForHqlKeyword()
        //this.addBaseColumnsCandidates()
        //this.addCandidatesForVariable()
      }
    }
  }

  addCandidatesForParsedStatement(ast: AST) {
    logger.info("*****addCandidatesForParsedStatement*****")
    if (!ast.type) {
      this.addCandidatesForBasicKeyword()
    } else if (ast.type === 'delete') {
      this.addCandidatesForParsedDeleteStatement(ast)
    } else if (ast.type === 'select' || ast.type === 'create_table') {
      this.addCandidatesForParsedSelectQuery(ast)
    } else {
      logger.info(`AST type not supported yet: ${ast.type}`)
    }
  }

  addJoinCondidates(ast: SelectStatement) {
    createJoinCondidates(
      ast,
      this.schema.tables,
      this.pos,
      this.lastToken
    ).forEach((v) => {
      this.addCandidate(v)
    })
  }

  addCandidatesForFunctions() {
    //logger.debug("addCandidatesForFunctions this.schema.functions:",this.schema.functions)
    createFunctionCandidates(this.schema.functions, this.lastToken).forEach(
      (v) => {
        this.addCandidate(v)
      }
    )
  }

  addCandidatesForCusFunction() {
    //logger.info("=====into addCandidatesForCusFunction=====")
    createCusFunctionCandidates().forEach((v) => {
      this.addCandidate(v)
    })
  }

  addCandidatesForSelectStar(fromNodes: FromTableNode[], tables: Table[]) {
    //logger.info("=====into addCandidatesForSelectStar=====")
    createSelectAllColumnsCandidates(fromNodes, tables, this.lastToken).forEach(
      (v) => {
        this.addCandidate(v)
      }
    )
  }

  //系统内嵌变量
  addCandidatesForVariable(){
    //logger.info("=====系统内嵌变量=====")
    createVariableCandidates().forEach(
      (v) => {
        this.addCandidate(v)
      }
    )
  }

  //关键字
  addCandidatesForHqlKeyword() {
    //logger.info("=====关键字=====")
    createHqlKeywordCandidates().forEach(
      (v) => {
        this.addCandidate(v)
      }
    )
  }

  //常用字段（select关键字后提示）
  addBaseColumnsCandidates() {
    //logger.info("=====常用字段=====")
    createBaseColumnsCandidates().forEach(
      (v) => {
        this.addCandidate(v)
      }
    )
  }

  //自定义语法结构（开始输入时提示）
  addDefinedGrammarCandidates() {
    //logger.info("=====自定义语法结构=====")
    createDefinedGrammarCandidates().forEach(
      (v) => {
        this.addCandidate(v)
      }
    )
  }

  addCandidatesForScopedColumns(fromNodes: FromTableNode[], tables: Table[]) {
    //logger.info("=====into addCandidatesForScopedColumns=====")
    createCandidatesForScopedColumns(fromNodes, tables, this.lastToken).forEach(
      (v) => {
        this.addCandidate(v)
      }
    )
  }

  addCandidatesForAliases(fromNodes: FromTableNode[]) {
    //logger.info("=====into addCandidatesForAliases=====")
    createAliasCandidates(fromNodes, this.lastToken).forEach((v) => {
      this.addCandidate(v)
    })
  }
}

export function complete(
  sql: string,
  pos: Pos,
  schema: Schema = {
    tables: [], functions: [],
    association: ''
  },
  jupyterLabMode = false,
  ticketId: string
) {
  //if (logger.isDebugEnabled())
  //  logger.debug(`complete: ${sql}, ${JSON.stringify(pos)}`)
  const completer = new Completer(schema, sql, pos, jupyterLabMode, ticketId)
  let candidates = getNewArr(completer.complete())
  return { candidates: candidates, error: completer.error }
}

function getNewArr(arr:CompletionItem[]){
  let result = {}
  let rec:CompletionItem = []
  arr.forEach(val=>{
      result[val.label + val.kind] ? '': result[val.label + val.kind] = true && rec.push(val)
  })
  return rec
}

