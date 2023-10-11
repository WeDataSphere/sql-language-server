#!/bin/bash

base_path=$(cd `dirname $0`;pwd)
cd ${base_path}

# 读取配置文件
config=$(cat env.json)

# 解析 JSON 数据
log_file=$(echo "${config}" | jq -r '.log_file')
if [ ! -f ${log_file} ]; then
   touch ${log_file}
fi

server_port=$(echo "${config}" | jq -r '.server_port')
yarn_js=$(echo "${config}" | jq -r '.yarn_js')

echo "check server port ${server_port}"
port_status=`netstat -nlt|grep "${server_port}"|wc -l`
if [ $port_status -gt 0 ]
then
        echo "端口已被占用，即将调用server_stop.sh脚本停止服务"
        sh ./server_stop.sh
fi

nohup_log=$(dirname "$log_file")/sql-language-server-console.log
echo "log dirname: $nohup_log"

echo "begin to start server..."
cd ./example/monaco_editor
nohup npm run start >> $nohup_log 2>&1 &

# 使用 wait 命令等待所有并行命令完成
wait

tail -n 5 ${log_file}

echo "log path: ${log_file}"
echo "Service  started."