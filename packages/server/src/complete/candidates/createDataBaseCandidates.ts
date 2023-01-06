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
function allDataBaseCombinations(table: Table): string[] {
  return [table.database]
}

export function createDataBaseCandidates(
  tables: Table[],
  lastToken: string,
  onFromClause?: boolean
) {
  var dataBaseNames = new Set()
  let databases = tables.flatMap((table) => allDataBaseCombinations(table))
  databases.map(database => dataBaseNames.add(database))
  return Array.from(dataBaseNames)
    .map((aTableNameVariant) => {
      return new Identifier(
        lastToken,
        aTableNameVariant,
        '',
        ICONS.DATABASE,
        onFromClause ? 'FROM' : 'OTHERS'
      )
    })
    .filter((item) => item.matchesLastToken())
    .map((item) => item.toCompletionItem())
}
