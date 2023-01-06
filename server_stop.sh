#!/bin/bash
#read -p "输入 你要kill的端口号: " a
echo -e "kill server port 3033"
for SERVER_PID in `lsof -i:3033 | awk '{print $2}' | grep -v \'PID\'`;
 do 
   echo -e "language server process id: " ${SERVER_PID}; 
   kill -9 $SERVER_PID;
done

echo -e "language server is stop"

