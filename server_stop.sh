#!/bin/bash

echo -e "sql languge server will be stopped"

base_path=$(cd `dirname $0`;pwd)
cd "${base_path}"
echo -e "current path: ${base_path}"

# 读取配置文件
config=$(cat env.json)
echo -e "config file params:${config}"

# 解析 JSON 数据
log_file=$(echo "${config}" | jq -r '.log_file')
echo -e "log file:${log_file}"

record_path=$(dirname $log_file)/language-server-kill-record.log
echo -e "language server kill process record path:${record_path}"

current_time=$(date "+%Y.%m.%d-%H:%M:%S")

echo -e "check sql-language-server process"
for SLS_PID in `ps aux | grep ${base_path} | grep nodejs/bin/node | grep src/server/server.ts |egrep -v "grep" | awk '{print $2}'`
 do
   echo -e "[${current_time}][sql-language-server] kill process id: ${SLS_PID}" |tee -a ${record_path}
   kill -15 $SLS_PID;
done

echo -e "sql-language-server stop completion"