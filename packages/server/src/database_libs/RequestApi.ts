import { syncBody } from './CommonUtils'
import log4js from 'log4js'
import * as fs from 'fs'
import path from 'path'

const ini = require('ini');
const logger = log4js.getLogger()
const linkis_addr = readPropertiesFile('linkis_addr');

type SchemaInfo = {
    dbCapacity: string
    dbName: string
    dbSize: string
    description: string
    tableQuantity: string
  }

export type ColumsInfo = {
    columnComment: string | null
    columnName: string
    columnType: string
}

type ColumField = {
    columnName: string
    columnType: string
    columnComment: string
    partitioned: string
  }

  export function readPropertiesFile(key: any) {
    try {
        const configPath = path.join(path.resolve(__dirname, '../../../../'), "/params.properties");
        const fileContent = fs.readFileSync(configPath, "utf-8");
        const properties = ini.parse(fileContent);
        return properties[key];
    } catch (error) {
        logger.error("读取配置文件出错：", error);
        return null;
    }
}


export async function getAllDatabases(ticketId:string):Promise<string[]>{
    var body = await syncBody(linkis_addr + '/api/rest_j/v1/datasource/all','GET',ticketId);
    if(+body.status===0){
      logger.info(ticketId +":"+"request /api/rest_j/v1/datasource/all success!")
    }else{
      logger.info(ticketId +":"+"/api/rest_j/v1/datasource/all linkis call error:",body.message)
      return [];
    }
    return body.data.dbs;
  }
  
export async function getUdfAll(ticketId:string):Promise<string[]>{
     var body = await syncBody(linkis_addr + '/api/rest_j/v1/udf/all','POST',ticketId);
     if(+body.status===0){
      logger.info(ticketId +":"+ "request /api/rest_j/v1/udf/all success!")
    }else{
      logger.info(ticketId +":"+"/api/rest_j/v1/udf/all linkis call error:",body.message)
      return [];
    }
    return body.data.udfTree.udfInfos;
  }

export  async function getTableColums(db:string,table:string, ticketId:string):Promise<ColumsInfo[]>{
    logger.info("call function getTableColums...")
    var body = await syncBody(linkis_addr + '/api/rest_j/v1/datasource/columns?database=' + db + '&table=' + table,'GET',ticketId);
    if(+body.status===0){
       logger.info("call linkis method /api/rest_j/v1/datasource/columns?database=" + db + '&table=' + table + " success!")
    }else{
       logger.info(body.message)
    }
    logger.info("request linkis getColums=====>",body.data)
    return body.data
   }
 
export  async function getSchemaBaseInfo(dbName:string, ticketId:string):Promise<SchemaInfo>{
     logger.info("call function getSchemaBaseInfo...")
     var body = await syncBody(linkis_addr + '/api/rest_j/v1/dss/datapipe/datasource/getSchemaBaseInfo?dbName=' + dbName,'GET',ticketId);
     if(+body.status===0){
        logger.info("call linkis method /api/rest_j/v1/dss/datapipe/datasource/getSchemaBaseInfo?dbName=" + dbName + " success!")
     }else{
        logger.info(body.message)
     }
     logger.info("request linkis getSchemaBaseInfo=====>",body.data)
     return body.data
    }