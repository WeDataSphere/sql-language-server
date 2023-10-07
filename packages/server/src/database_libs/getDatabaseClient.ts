import AbstractClient from './AbstractClient'
import MysqlClient from './MysqlClient'

export default function getDatabaseClient(): AbstractClient {
    return new MysqlClient();
}
