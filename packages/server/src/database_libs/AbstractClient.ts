import log4js from 'log4js'
import { Connection } from '../SettingStore'
import { syncBody } from './CommonUtils'

const logger = log4js.getLogger()
export let dbs = []

async function getAllDatabases(ticketId:string):Promise<string[]>{
  var body = await syncBody('http://127.0.0.1:8088/api/rest_j/v1/datasource/all','GET',ticketId);
  if(+body.status===0){
    console.log(ticketId +":"+"request /api/rest_j/v1/datasource/all success!")
  }else{
    console.log(ticketId +":"+"/api/rest_j/v1/datasource/all linkis call error:",body.message)
    return [];
  }
  const result = body.data.dbs 
  dbs = result
  return result;
}

async function getUdfAll(ticketId:string):Promise<string[]>{
   var body = await syncBody('http://127.0.0.1:8088/api/rest_j/v1/udf/all','POST',ticketId);
   if(+body.status===0){
    console.log(ticketId +":"+ "request /api/rest_j/v1/udf/all success!")
  }else{
    console.log(ticketId +":"+"/api/rest_j/v1/udf/all linkis call error:",body.message)
    return [];
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
  association: string
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

  async getSchema(ticketId:string): Promise<Schema> {
    const schema: Schema = { tables: [], functions: [] , association: ""}
    try {
      console.log("================get udf ===================")
      let udfs = await getUdfAll(ticketId)
      if(typeof(udfs)=="undefined") return schema;
      let udfArray = Array.from(udfs)
      schema.functions  = udfArray.map(udf=>({
         name: udf.udfName+"()",
         description: udf.udfName+"()"
      }));
      console.log("================get all databases ===================")
      let result = await getAllDatabases(ticketId)
      if(typeof(result)=="undefined"){
         result=[];
      }
      let dbsArray = Array.from(result)
      let databaseArry=[]
      dbsArray.map(item=>{
         databaseArry.push(item.databaseName)
      })
      console.log("载入数据库数量:",databaseArry.length)
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
            }))
          )
        )
    array_schema.push(schema.tables)
    }
    schema.tables = array_schema.flat(Infinity)
    console.log("载入表数量：",schema.tables.length)
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
