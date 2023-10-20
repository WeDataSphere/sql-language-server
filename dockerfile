FROM uat.sf.dockerhub.stgwebank/common/openeuler:wcs-os_0.1.3_nodejs_v1

WORKDIR /data/sql-language-server

ARG PKG_NAME=$PKG_NAME
ENV CATALINA_HOME=/data
RUN mkdir -p $CATALINA_HOME 
ADD $PKG_NAME $CATALINA_HOME/
RUN pwd
RUN ls -l $CATALINA_HOME/

EXPOSE 3033
CMD /bin/sh /data/sql-language-server/server_start.sh