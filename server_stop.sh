#!/bin/bash
echo -e "sql languge server will be stopped"
echo -e "kill server port 3033"
for SERVER_PID in `netstat -nlp | grep :3033 | awk '{print $7}' | awk -F"/" '{ print $1 }' | grep -v \'PID\'`;
 do 
   echo -e "language server process id: " ${SERVER_PID}; 
   kill -q $SERVER_PID;
done
echo -e "language server is stop"

sleep 2s
cur_pid=$$
base_name=$(basename $BASH_SOURCE)
echo -e "check sql-language-server process"
for SLS_PID in `ps aux | grep 'src/server/server.ts' | egrep -v "grep|$base_name" | awk '{print $2}' | sed "/$cur_pid/d"`
 do
   echo -e "sql-language-server process id: " ${SLS_PID};
   kill -q $SLS_PID;
done

sleep 2s
echo -e "sql-language-server stop completion"