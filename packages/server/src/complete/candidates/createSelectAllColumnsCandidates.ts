import { FromTableNode } from '@joe-re/sql-parser'
import { Table } from '../../database_libs/AbstractClient'
import { makeColumnName } from '../StringUtils'
import { getAliasFromFromTableNode } from '../StringUtils'
import { isTableMatch } from '../AstUtils'
import { ICONS } from '../CompletionItemUtils'

export function createSelectAllColumnsCandidates(
  fromNodes: FromTableNode[],
  tables: Table[],
  lastToken: string
) {
  return tables.flatMap((table) => {
    return fromNodes
      .filter((fromNode) => isTableMatch(fromNode, table))
      .map(getAliasFromFromTableNode)
      .filter(
        () =>
          lastToken.toUpperCase() === 'SELECT' || // complete SELECT keyword
          lastToken === ''
      ) // complete at space after SELECT
      .map((alias) => {
        const columnNames = table.columns
          .map((col) => makeColumnName(alias, col.columnName))
          .join(',')
        const label = `Select all columns from ${alias}`
        let prefix = ''
        if (lastToken) {
          prefix = lastToken + ' '
        }

        return {
          label: label,
          insertText: prefix + columnNames,
          filterText: prefix + label,
          detail: 'utility',
          kind: ICONS.UTILITY,
        }
      })
  })
}
