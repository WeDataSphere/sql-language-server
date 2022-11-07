import { toCompletionItemForCusFunction } from '../CompletionItemUtils'

const CLAUSES: string[] = [
   'COUNT()',
   'AVG()',
   'MAX()',
   'MIN()',
   'CONCAT()',
   'LOWER()',
   'UPPER()',
   'SUBSTRING()',
   'CURDATE()',
   'CURTIME()',
   'NOW()',
   'ABS()',
   'ROUND()',
   'LENGTH()',
   'TRIM()',
   'REPLACE()',
   'REPEAT()',
   'REVERSE()',
]

export function createCusFunctionCandidates() {
  return CLAUSES.map((v) => toCompletionItemForCusFunction(v))
}
