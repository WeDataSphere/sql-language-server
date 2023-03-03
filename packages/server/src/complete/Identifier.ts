import { CompletionItem, CompletionItemKind } from 'vscode-languageserver-types'
import { makeTableAlias } from './StringUtils'

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

type OnClause = 'FROM' | 'ALTER TABLE' | 'OTHERS'
export class Identifier {
  lastToken: string
  identifier: string
  detail: string
  kind: CompletionItemKind
  onClause: OnClause

  constructor(
    lastToken: string,
    identifier: string,
    detail: string,
    kind: CompletionItemKind,
    onClause?: OnClause
  ) {
    this.lastToken = lastToken
    this.identifier = identifier
    this.detail = detail ?? ''
    this.kind = kind
    this.onClause = onClause ?? 'OTHERS'
  }

  matchesLastToken(): boolean {
    //let label = this.identifier.includes('.')?this.identifier.substring(this.identifier.indexOf('.')+1):this.identifier
    let label = ''
    if(this.identifier.includes('.') && this.lastToken.lastIndexOf('.') === -1){
      label = this.identifier.substring(this.identifier.indexOf('.')+1)
    }else{
      label = this.identifier
    }
    if (label.startsWith(this.lastToken)) {
      // prevent suggesting the lastToken itself, there is nothing to complete in that case
      if (this.identifier !== this.lastToken) {
        return true
      }
    }
    return false
  }

  toCompletionItem(): CompletionItem {
    const idx = this.lastToken.lastIndexOf('.')
    let label = this.identifier.substring(idx + 1)
    let kindName: ''
    let tableAlias = ''
    let sortText = ''
    let insertText = label
    if (this.kind === ICONS.TABLE || this.kind === ICONS.DATABASE || this.kind === ICONS.DBTABLE){
      let tableName = label
      const i = tableName.lastIndexOf('.')
      if (i > 0) {
        tableName = label.substring(i + 1)
      }
      tableAlias = this.onClause === 'FROM' ? makeTableAlias(tableName) : '' 
      if (this.kind === ICONS.TABLE) {
        //kindName = 'table'
        label = this.identifier.substring(this.identifier.indexOf('.')+1)
        kindName = this.identifier.substring(0,this.identifier.indexOf('.'))
        sortText = 'e'
      } else if(this.kind === ICONS.DATABASE) {
        kindName = 'db'
        sortText = 'c'
      } else if(this.kind === ICONS.DBTABLE) {
        label = this.identifier.substring(label.indexOf('.')+1)
        kindName = this.identifier.substring(0,this.identifier.indexOf('.'))
        sortText = 'd'
      }
    } else {
        kindName = 'column'
    }

    const item: CompletionItem = {
      label: label,
      detail: kindName === 'column' ? 'column':`${kindName} ${this.detail}`,
      kind: this.kind,
      sortText: sortText,
      documentation: `${this.detail}`,
    }

    if (this.kind === ICONS.TABLE || this.kind === ICONS.DBTABLE) {
      if (tableAlias) {
        item.insertText = `${insertText} as ${tableAlias}`
      } else {
        item.insertText = insertText
      }
    }
    return item
  }
}
