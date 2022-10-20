import { toCompletionItemForKeyword } from '../CompletionItemUtils'

const CLAUSES: string[] = [
  'SELECT',
  'WHERE',
  'ORDER BY',
  'GROUP BY',
  'LIMIT',
  '--',
  '/*',
  '(',
  'TRUE',
  'FALSE',
  'DEFAULT',
  'NULL',
  'COUNT()',
  'AVG()',
  'SUM()',
  'MIN()',
  'MAX()',
]

export function createBasicKeywordCandidates() {
  return CLAUSES.map((v) => toCompletionItemForKeyword(v))
}
