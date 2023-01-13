import * as path from 'path'
import log4js from 'log4js'
import process from 'process'

const MAX_LOG_SIZE = 1024 * 1024
const MAX_LOG_BACKUPS = 10
//const LOG_FILE_DIR = path.resolve(process.env.log_file, '../')
const logger = log4js.getLogger()
//const LOG_FILE_PATH = path.join(path.resolve(__dirname, '../../../'), 'sql-language-server.log')

export default function initializeLogging(debug = false) {
  let LOG_FILE_PATH = '/appcom/logs/dssInstall/sql-language-server.log'
  if(process.env.log_file !== void 0 ){
     LOG_FILE_PATH = process.env.log_file
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
        axLogSize: MAX_LOG_SIZE,
        ackups: MAX_LOG_BACKUPS,
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
