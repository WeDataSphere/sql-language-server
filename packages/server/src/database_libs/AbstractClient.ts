import { readFileSync } from 'fs'
import log4js from 'log4js'
import { SSHConnection } from 'node-ssh-forward'
import { Connection } from '../SettingStore'
import { syncBody } from './CommonUtils'

const logger = log4js.getLogger()
export const dbs = []

async function getAllDatabases():string[]{
  var body = await syncBody('http://127.0.0.1:8088/api/rest_j/v1/datasource/all','GET');
  if(+body.status===0){
    console.log("request linkis datasource all success!")
  }else{
    console.log("linkis call error:",body.message)
    return;
  }
  const result = body.data.dbs 
  dbs = result
  return result;
}

async function getUdfAll():string[]{
   var body = await syncBody('http://127.0.0.1:8088/api/rest_j/v1/udf/all','POST');
   if(+body.status===0){
    console.log("request linkis udf all success!")
  }else{
    console.log("linkis call error:",body.message)
    return;
  }
  const udfInfos = body.data.udfTree.udfInfos
  return udfInfos
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
    let functions = []
    try {
      console.log("================abstract get schema ===================")
      let udfs = await getUdfAll()
      if(typeof(udfs)=="undefined") return;
      let udfArray = Array.from(udfs)
      functions = udfArray.map(udf=>({
         name: udf.udfName+"()",
         description: udf.udfName+"()"
      }));
      schema.functions = functions
      let result = await getAllDatabases()
      if(typeof(result)=="undefined"){
         result=[];
      }
      let dbsArray = Array.from(result)
      let databaseArry=[]
      dbsArray.map(item=>{
         databaseArry.push(item.databaseName)
      })
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
    array_schema.push(schema.tables)
    }
    schema.tables = array_schema.flat(Infinity)
    } catch (e) {
      logger.error(e)
      throw e
    } 
    return schema
  }

  private toColumnFromRawField(field: RawField): Column {
    return {
      columnName: field.field,
      description: `${field.field}(Type: ${field.type}, Null: ${field.null}, Default: ${field.default})`,
    }
  }

}
