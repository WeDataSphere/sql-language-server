import { Table } from '../../database_libs/AbstractClient'
import { Identifier } from '../Identifier'
import { ICONS } from '../CompletionItemUtils'

/**
 * Given a table returns all possible ways to refer to it.
 * That is by table name only, using the database scope,
 * using the catalog and database scopes.
 * @param table
 * @returns
 */
function allDbTableCombinations(table: Table): string[] {
  return [table.database + '.' + table.tableName]
}

export function createDbTableCandidates(
  tables: Table[],
  lastToken: string,
  onFromClause?: boolean
) {
  console.log("into method createDbTableCandidates")
  // console.log("createDbTableCandidates:",allDbTableCombinations(table))
  return tables.flatMap((table) => allDbTableCombinations(table))
    .map((aTableNameVariant) => {
      return new Identifier(
        lastToken,
        aTableNameVariant,
        '',
        ICONS.DBTABLE,
        onFromClause ? 'FROM' : 'OTHERS'
      )
    })
    .filter((item) => item.matchesLastToken())
    .map((item) => item.toCompletionItem())
}

