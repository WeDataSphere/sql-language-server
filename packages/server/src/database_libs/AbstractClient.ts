import { readFileSync } from 'fs'
import log4js from 'log4js'
import { SSHConnection } from 'node-ssh-forward'
import { Connection } from '../SettingStore'
import { syncBody } from './CommonUtils'

const logger = log4js.getLogger()
export const dbs = []

async function getAllDatabases():string[]{
  console.log("call method getAllDatabases ============")
  var body = await syncBody('http://127.0.0.1:8088/api/rest_j/v1/datasource/all');
  console.log("result return =====>>>",body.status);
  if(+body.status===0){
    console.log("request linkis datasource all success!")
  }else{
    console.log("linkis call error:",body.message)
    return body.message;
  }
  dbs = body.data.dbs 
  return body;
}

export type RawField = {
  field: string
  type: string
  null: 'Yes' | 'No'
  default: string
  comment: string
}
export type Column = {
  columnName: string
  description: string
}
export type Table = {
  catalog: string | null
  database: string | null
  tableName: string
  columns: Column[]
}
export type DbFunction = {
  name: string
  description: string
}

export type Schema = {
  tables: Table[]
  functions: DbFunction[]
}

export default abstract class AbstractClient {
  connection: unknown

  constructor(protected settings: Connection) {}

  abstract connect(): Promise<boolean> | boolean
  abstract disconnect(): void
  abstract getTables(): Promise<string[]>
  abstract getColumns(tableName: string): Promise<RawField[]>
  abstract DefaultPort: number
  abstract DefaultHost: string
  abstract DefaultUser: string

  async getSchema(): Promise<Schema> {
    const schema: Schema = { tables: [], functions: [] }
    try {
      //const tables = await this.getTables()
      let result = await getAllDatabases()
      let databaseArry=[]
      result.data.dbs.map(item=>{
         databaseArry.push(item.databaseName)
      })
      //console.log("get linkis databaseArry:",databaseArry)
      let array_schema=new Array() 
      for(var datasourceConfig of databaseArry){
        const tables = await this.getTables(datasourceConfig)
        schema.tables = await Promise.all(
          tables.map((v) =>
            this.getColumns(v).then((columns:any) => ({
              catalog: null,
              database: datasourceConfig,
              tableName: v,
              columns: null,
              //columns: columns.map((v:any) => this.toColumnFromRawField(v)),
            }))
          )
        )
    //console.log("schema.tables-1:",schema.tables)
    array_schema.push(schema.tables)
    }
    schema.tables = array_schema.flat(Infinity)
   // console.log("tables:",array_schema)
   // console.log("AbstractClient async getSchema:",JSON.stringify(schema))
    } catch (e) {
      logger.error(e)
      throw e
    } 
    return schema
  }

  private toColumnFromRawField(field: RawField): Column {
  // console.log("call method toColumnFromRawField:",field)
    return {
      columnName: field.field,
      description: `${field.field}(Type: ${field.type}, Null: ${field.null}, Default: ${field.default})`,
    }
  }

}
