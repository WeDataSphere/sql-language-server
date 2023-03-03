import { toCompletionItemForKeyword } from '../CompletionItemUtils'

const CLAUSES: string[] = [
  'SELECT',
  'FROM',
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
]

export function createBasicKeywordCandidates() {
  return CLAUSES.map((v) => toCompletionItemForKeyword(v))
}
