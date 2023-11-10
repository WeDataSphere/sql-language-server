#!/bin/bash

function run(){

    # shellcheck disable=SC2046
    # shellcheck disable=SC2164
    # shellcheck disable=SC2006
    base_path=$(cd `dirname "$0"`;pwd)
    # shellcheck disable=SC2164
    cd "${base_path}"

    # 读取配置文件
    config=$(cat params.properties)

    # 解析 JSON 数据
    log_file=$(echo "${config}" | grep "^log_file=" | cut -d'=' -f2)
    if [ ! -f ${log_file} ]; then
        touch ${log_file}
    fi
    server_port=$(echo "${config}" | grep "^server_port=" | cut -d'=' -f2)

    echo "check server port ${server_port}"
    # shellcheck disable=SC2126
    # shellcheck disable=SC2006
    port_status=`netstat -nlt|grep "${server_port}"|wc -l`

    if [ "$port_status" -gt 0 ]
    then
        echo "端口已被占用，即将调用server_stop.sh脚本停止服务"
        sh ./server_stop.sh
    fi

    nohup_log=$(dirname "$log_file")/sql-language-server-console.log
    echo "log dirname: $nohup_log"

    echo "begin to build sqlint..."
    # cd ./packages/sqlint
    # nohup npm run build >> $nohup_log 2>&1
    nohup npm run build:sqlint && run-p watch:sqlint watch:server watch:dev-server:client >> $nohup_log 2>&1

    # 等待sqlint构建完成
    echo "waiting for sqlint build finish..."
    wait

    echo "begin to start server..."
    # cd ../../example/monaco_editor
    cd ./example/monaco_editor
    nohup npm run start >> $nohup_log 2>&1 &

    tail -n 5 "${log_file}"


    echo "log path: ${log_file}"
    echo "Service  started."
}

run