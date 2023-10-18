import * as path from 'path'
import log4js from 'log4js'
import process from 'process'

const fs = require('fs');
const ini = require('ini');

const MAX_LOG_SIZE = 1024 * 1024 * 100
const MAX_LOG_BACKUPS = 10
const logger = log4js.getLogger()

function readPropertiesFile(key:any) {
  const configPath = path.join(path.resolve(__dirname, '../../../'),"/params.properties")
  const fileContent = fs.readFileSync(configPath, "utf-8");
  const properties = ini.parse(fileContent);
  return properties[key];
}

export default function initializeLogging(debug = false) {
  let LOG_FILE_PATH = '/appcom/logs/dssInstall/sql-language-server.log'
  if(readPropertiesFile("log_file") !== void 0 ){
     LOG_FILE_PATH = readPropertiesFile("log_file")
  }
  let LOG_FILE_DIR = path.resolve(LOG_FILE_PATH, '../')
  try {
    fs.exists(LOG_FILE_DIR,(exit: boolean) => {
      if(!exit) fs.mkdirSync(LOG_FILE_DIR)
    })
  } catch (error){
    logger.error("日志文件夹创建失败：",LOG_FILE_DIR)
  }
  log4js.configure({
    appenders: {
      server: {
        type: 'file',
        filename: LOG_FILE_PATH,
        maxLogSize: MAX_LOG_SIZE,
        maxBackup: MAX_LOG_BACKUPS,
      },
    },
    // TODO: Should accept level
    categories: {
      default: { appenders: ['server'], level: debug ? 'debug' : 'debug' },
    },
  })

  process.on('uncaughtException', (e) => logger.error('uncaughtException', e))
  process.on('unhandledRejection', (e) => logger.error('unhandledRejection', e))
  return logger
}
