import AbstractClient, { RawField } from './AbstractClient'
import { dbs } from './AbstractClient'
// eslint-disable-next-line @typescript-eslint/no-var-requires

export default class MysqlClient extends AbstractClient {

  get DefaultPort() {
    return 3306
  }
  get DefaultHost() {
    return '127.0.0.1'
  }
  get DefaultUser() {
    return 'root'
  }

  async connect() {
    
    return true
  }

  disconnect() {

  }

  getTables(dataBase: string): Promise<string[]> {
    return new Promise((resolve) => {
      let macher =dbs.filter(item => item.databaseName==dataBase );
      const tables = macher[0].tables.map(x=>x.tableName);
      resolve(tables)
    })
  }

  getColumns(tableName: string): Promise<RawField[]> {
    const results = [
      {
        Field: 'id',
        Type: 'int(11)'
      },
      {
        Field: 'updatedAt',
        Type: 'datetime',
        Collation: null,
        Null: 'NO',
        Key: '',
        Default: null,
        Extra: '',
        Privileges: 'select,insert,update,references',
        Comment: ''
      }
    ]
    return new Promise((resolve) => {
      const columns: RawField[] = (results as any).map((v: any) => ({
        field: v.Field,
        type: v.Type,
        null: v.Null,
        default: v.Default,
        comment: v.Comment,
      }))
      resolve(columns)
    })
  }
}

