import { CompletionItem, CompletionItemKind } from 'vscode-languageserver-types'
import { DbFunction } from '../database_libs/AbstractClient'

export const ICONS = {
  KEYWORD: CompletionItemKind.Text,
  COLUMN: CompletionItemKind.Interface,
  TABLE: CompletionItemKind.Field,
  FUNCTION: CompletionItemKind.Property,
  ALIAS: CompletionItemKind.Variable,
  UTILITY: CompletionItemKind.Event,
  DATABASE: CompletionItemKind.Constructor,
  DBTABLE: CompletionItemKind.Unit,
}

export function toCompletionItemForDb(f: DbFunction): CompletionItem {
  const item: CompletionItem = {
    label: f.name,
    detail: 'db',
    kind: ICONS.DATABASE,
    documentation: f.description,
  }
  return item
}

export function toCompletionItemForFunction(f: DbFunction): CompletionItem {
  const item: CompletionItem = {
    label: f.name,
    detail: 'udfFunction',
    kind: ICONS.FUNCTION,
    documentation: f.description,
    tags: f.tags,
  }
  return item
}

export function toCompletionItemForAlias(alias: string): CompletionItem {
  const item: CompletionItem = {
    label: alias,
    detail: 'alias',
    kind: ICONS.ALIAS,
  }
  return item
}

export function toCompletionItemForKeyword(name: string): CompletionItem {
  const item: CompletionItem = {
    label: name,
    kind: ICONS.KEYWORD,
    detail: 'keyword',
  }
  return item
}

export function toCompletionItemForCusFunction(name: string, documentation: string): CompletionItem {
  const item: CompletionItem = {
    label: name,
    kind: ICONS.FUNCTION,
    detail: 'baseFunction',
    documentation: documentation
  }
  return item
}

export function toCompletionItemForHqlKeyword(name: string, detail:string, documentation:string): CompletionItem {
  const item: CompletionItem = {
    label: name,
    kind: ICONS.KEYWORD,
    detail: detail,
    documentation: documentation
  }
  return item
}
