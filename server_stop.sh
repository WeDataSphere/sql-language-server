#!/bin/bash

echo -e "sql languge server will be stopped"
# 读取配置文件
config=$(cat env.json)

# 解析 JSON 数据
log_file=$(echo "${config}" | jq -r '.log_file')
server_port=$(echo "${config}" | jq -r '.server_port')

echo -e "kill server port ${server_port}"
for SERVER_PID in `netstat -nlp | grep :${server_port} | awk '{print $7}' | awk -F"/" '{ print $1 }' | grep -v \'PID\'`;
 do 
   echo -e "language server process id: " ${SERVER_PID}; 
   kill -9 $SERVER_PID;
done
echo -e "language server is stop"

sleep 2s
cur_pid=$$
base_name=$(basename $BASH_SOURCE)
echo -e "check sql-language-server process"
for SLS_PID in `ps aux | grep 'src/server/server.ts' | egrep -v "grep|$base_name" | awk '{print $2}' | sed "/$cur_pid/d"`
 do
   echo -e "sql-language-server process id: " ${SLS_PID};
   kill -9 $SLS_PID;
done

sleep 2s
echo -e "sql-language-server stop completion"