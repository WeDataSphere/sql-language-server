import { toCompletionItemForCusFunction } from '../CompletionItemUtils'

const CLAUSES: string[] = [
   'COUNT()',
   'MOD()',
   'MAX()',
   'MIN()',
   'RANK()',
   'DENSE_RANK()',
   'ROW_NUMBER()',
   'DATEDIFF()',
   'DATE_FORMAT()',
   'ROUND()',
   'CONCAT()',
   'LENGTH()',
   'LOCATE()',
   'INSTR()',
   'LEFT()',
   'RIGHT()',
   'SUBSTRING()',
   'TRIM()',
   'LTRIM()',
   'RTRIM()',
   'REPLACE()',
   'REVERSE()',
]

export function createCusFunctionCandidates() {
  return CLAUSES.map((v) => toCompletionItemForCusFunction(v))
}
