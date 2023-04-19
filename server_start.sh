#!/bin/bash
base_path=$(cd `dirname $0`;pwd)
cd ${base_path}

echo "start to build sqlint..."
yarn-js build:sqlint

echo "start to build server..."
yarn-js build:server

echo "begin to start server..."
yarn-js watch:dev-server:server

sleep 5&
echo "server start finish!"