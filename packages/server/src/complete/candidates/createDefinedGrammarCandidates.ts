export function createDefinedGrammarCandidates(){
    return [
        {
            label: 'drop table',
            documentation: '删除hive表',
            insertText: 'drop table if exists {${1:table_name}$0};',
            detail: '常用语法结构',
            filterText: 'filter',
        },
        {
            label: 'create table partitioned by',
            documentation: '创建hive分区表',
            insertText: 'create table {${1:table_name}$0} ({${2:columns}}) partitioned by ({${3:partition}}) row format delimited fields terminated by "," stored as orc;',
            detail: '常用语法结构',
            filterText: 'test'
        },
        {
            label: 'create table as select',
            documentation: '通过select创建表',
            insertText: 'create table {${1:table_name}$0} as select;',
            detail: '常用语法结构',
        },
        {
            label: 'insert into table',
            documentation: '添加方式插入数据',
            insertText: 'insert into table {${1:table_name}$0} partition({partition});',
            detail: '常用语法结构',
        },
        {
            label: 'insert overwrite table',
            documentation: '覆盖方式插入数据',
            insertText: 'insert overwrite table {${1:table_name}$0} partition({partition});',
            detail: '常用语法结构',
        },
        {
            label: "dbpd_alm_ods_safe.alm_rep_fact_hivestream_fixed_dtl",
            detail: "db.table ",
            filterText: "rep",
            insertTextFormat: 1,
            insertText: "dbpd_alm_ods_safe.alm_rep_fact_hivestream_fixed_dtl",
            kind: 11,
            sortText: "b"
       }
    ]
}
