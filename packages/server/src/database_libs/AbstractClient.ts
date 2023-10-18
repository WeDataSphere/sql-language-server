import log4js from 'log4js'
import { CompletionItemTag } from 'vscode-languageserver-types'
import { getAllDatabases,getUdfAll} from './RequestApi'

const logger = log4js.getLogger()
let sumDatabases = 0
let sumTables = 0
export let dbs = []

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
  tags: CompletionItemTag[]
}

export type Schema = {
  tables: Table[]
  functions: DbFunction[]
  association: string
}

export default abstract class AbstractClient {
  connection: unknown

  abstract connect(): Promise<boolean> | boolean
  abstract disconnect(): void
  abstract getTables(): Promise<string[]>
  abstract getColumns(tableName: string): Promise<RawField[]>
  abstract DefaultPort: number
  abstract DefaultHost: string
  abstract DefaultUser: string

  async getSchema(ticketId:string): Promise<Schema> {
    const schema: Schema = { tables: [], functions: [] , association: ""}
    let functions = []
    try {
      logger.info("================get udf ===================")
      let udfs = await getUdfAll(ticketId)
      if(typeof(udfs)=="undefined") return schema;
      let udfArray = Array.from(udfs)
      functions = udfArray.map(udf=>({
         name: udf.udfName+"()",
         description: udf.expire ? '过期函数':udf.description,
         tags: udf.expire ? [CompletionItemTag.Deprecated] : null,
      }));
      schema.functions = functions
      logger.info("================get all databases ===================")
      let result = await getAllDatabases(ticketId)
      dbs = result;
      if(typeof(result)=="undefined"){
         result=[];
      }
      let dbsArray = Array.from(result)
      let databaseArry=[]
      dbsArray.map(item=>{
         databaseArry.push(item.databaseName)
      })
      sumDatabases += databaseArry.length
      logger.info("本次载入数据库数量:",databaseArry.length)
      logger.info("共载入数据库数量:",sumDatabases)
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
    sumTables += schema.tables.length
    logger.info("本次载入表数量：",schema.tables.length)
    logger.info("共载入表数量:",sumTables)
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

  public basesNumberInit(): void {
    logger.info("============初始化库表数据载入===========")
    sumDatabases = 0;
    sumTables = 0;
  }

}
