#!/bin/bash
base_path=$(cd `dirname $0`;pwd)
cd ${base_path}

# 读取配置文件
config=$(cat env.json)

# 解析 JSON 数据
log_file=$(echo "${config}" | jq -r '.log_file')

server_port=$(echo "${config}" | jq -r '.server_port')

echo "check server port ${server_port}"
port_status=`netstat -nlt|grep "${server_port}"|wc -l`
if [ $port_status -gt 0 ]
then
        echo "端口已被占用，即将调用server_stop.sh脚本停止服务"
        sh ./server_stop.sh
fi

echo "start to build sqlint..."
yarn-js build:sqlint

echo "start to build server..."
yarn-js build:server

echo "begin to start server..."
yarn-js watch:dev-server:server

tail -n 5 ${log_file}

sleep 3&
echo "log path: ${log_file}"
echo "server start finish!"