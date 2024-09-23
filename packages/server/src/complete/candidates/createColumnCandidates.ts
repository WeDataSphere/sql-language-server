import { CompletionItem } from 'vscode-languageserver-types'
import { FromTableNode } from '@joe-re/sql-parser'
import { Table } from '../../database_libs/AbstractClient'
import { getAliasFromFromTableNode, makeColumnName } from '../StringUtils'
import { isTableMatch } from '../AstUtils'
import { ICONS } from '../CompletionItemUtils'
import { Identifier } from '../Identifier'
import { getTableColums } from '../../database_libs/RequestApi'

export function createCandidatesForColumnsOfAnyTable(
  tables: Table[],
  lastToken: string,
  tableName: string
): CompletionItem[] {
  console.log("================createCandidatesForColumnsOfAnyTable============")
  let tableArry = tableName.split(".")
  return tables.filter((table) => table.tableName === tableArry[1] && table.database === tableArry[0])
    .flatMap((table) => table.columns).filter((s)=> s !== null)
    .map((column) =>{ 
      return new Identifier(
        lastToken,
        column.columnName,
        '字段名称：' + column.columnName + '\r\n'+
        '类型：' + column.columnType + '\r\n' +
        '备注：' + column.columnComment,
        ICONS.COLUMN,
        'FROM'
      )
    })
    .filter((item) => item.matchesLastToken())
    .map((item) => item.toCompletionItem())
}

export function createCandidatesForScopedColumns(
  fromNodes: FromTableNode[],
  tables: Table[],
  lastToken: string,
  ticketId: string
): CompletionItem[] {
  return tables
    .flatMap((table) => {
      return fromNodes
        .filter((fromNode) => isTableMatch(fromNode, table))
        .map(getAliasFromFromTableNode)
        .filter((alias) => lastToken.startsWith(alias + '.'))
        .flatMap(async (alias) =>{
          if(!table.columns){
            let colums =  await getTableColums(table.database||'',table.tableName,ticketId)
            //组装字段
            table.columns = colums.colums
          }
          table.columns.map((col) => {
            return new Identifier(
              lastToken,
              makeColumnName(alias, col.columnName),
              '字段名称：' + col.columnName + '\r\n'+ 
              '类型：' + col.columnType + '\r\n' + 
              '备注：' + col.columnComment,
              ICONS.COLUMN
            )
          })
        })
    })
    .filter((item) => item.matchesLastToken())
    .map((item) => item.toCompletionItem())
}
