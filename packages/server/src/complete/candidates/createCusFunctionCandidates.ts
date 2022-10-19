import { toCompletionItemForCusFunction } from '../CompletionItemUtils'

const CLAUSES: string[] = [
   'TEST_CUS_FUNCTION()'
]

export function createCusFunctionCandidates() {
  return CLAUSES.map((v) => toCompletionItemForCusFunction(v))
}
