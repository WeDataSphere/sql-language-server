import { CompletionItem } from 'vscode-languageserver-types'
import { SelectStatement } from '@joe-re/sql-parser'
import { getNearestFromTableFromPos } from '../AstUtils'
import { Table } from '../../database_libs/AbstractClient'
import { toCompletionItemForKeyword } from '../CompletionItemUtils'
import { Pos } from '../complete'
import { createTableCandidates } from './createTableCandidates'
import { createDataBaseCandidates } from './createDataBaseCandidates'

export function createJoinCondidates(
  ast: SelectStatement,
  tables: Table[],
  pos: Pos,
  token: string
): CompletionItem[] {
  if (!Array.isArray(ast.from?.tables)) {
    console.log("!Array.isArray(ast.from?.tables)")
    return []
  }
  const result: CompletionItem[] = []
  //console.log("createJoinCondidates ast:",JSON.stringify(ast))
  //console.log("createJoinCondidates pos:",pos)
  //const fromTable = getNearestFromTableFromPos(ast.from?.tables || [], pos)
  const fromArry = ast.from?.tables || []
  const fromTable = fromArry[0] || {}
  //console.log("createJoinCondidates from table:",JSON.stringify(fromTable))
  //console.log("createJoinCondidates tables:",tables.slice(0,10))
  if (fromTable && fromTable.type === 'table') {
    //console.log("fromTable && fromTable.type === 'table'")
    result.push(...createDataBaseCandidates(tables, token, true))
    result.push(...createTableCandidates(tables, token, true))
    result.push(toCompletionItemForKeyword('INNER JOIN'))
    result.push(toCompletionItemForKeyword('LEFT JOIN'))
    result.push(toCompletionItemForKeyword('ON'))
  }
  return result
}
