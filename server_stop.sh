#!/bin/bash

echo -e "sql languge server will be stopped"

base_path=$(cd `dirname $0`;pwd)
echo -e "current pwd: ${base_path}"

# 读取配置文件
config=$(cat env.json)

# 解析 JSON 数据
log_file=$(echo "${config}" | jq -r '.log_file')
record_path=$(dirname $log_file)/language-server-kill-record.log
# server_port=$(echo "${config}" | jq -r '.server_port')

# echo -e "kill server port ${server_port}"
# if [ -z ${server_port} ]; then
#    echo -e "server port is empty, server will exit"
#    exit 1
# fi

# for SERVER_PID in `netstat -nlp | grep :${server_port} | awk '{print $7}' | awk -F"/" '{ print $1 }' | grep -v \'PID\'`;
#  do 
#    echo -e "language server process id: " ${SERVER_PID}; 
#    kill -9 $SERVER_PID;
# done
# echo -e "language server is stop"

current_time=$(date "+%Y.%m.%d-%H:%M:%S")

echo -e "check sql-language-server process"
for SLS_PID in `ps aux | grep ${base_path} | grep nodejs/bin/node | egrep -v "grep" | awk '{print $2}'`
 do
   echo -e "[${current_time}][sql-language-server] kill process id: ${SLS_PID}" |tee -a ${record_path}
   kill -15 $SLS_PID;
done

echo -e "sql-language-server stop completion"