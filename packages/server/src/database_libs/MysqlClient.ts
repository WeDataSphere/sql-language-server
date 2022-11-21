import AbstractClient, { RawField } from './AbstractClient'
import { dbs } from './AbstractClient'
import { map_colums } from '../createServer'
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
    //console.log("get tables dataBase:",dataBase)
    return new Promise((resolve) => {
      let macher =dbs.filter(item=>item.databaseName==dataBase);
      //console.log("gettables macher.tables===>",macher[0].tables)
      const tables = macher[0].tables.map(x=>x.tableName);
      //console.log("tables===========>>>>>>>",tables)
      resolve(tables)

    })
  }

  getColumns(tableName: string): Promise<RawField[]> {
    //let results1:any[] = [];
    //results1.push([]);
    //console.log("getColumns tableName:",tableName)
    //console.log("*------map_colums--------*",map_colums)
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

