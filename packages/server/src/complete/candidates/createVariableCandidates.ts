export function createVariableCandidates() {
    return [
          {
            label: 'run_date',
            documentation: '当前日期的前一天',
            insertText: '${run_date}',
            detail: '系统内嵌变量',
            sortText: 'f',
          }, {
            label: 'run_date_std',
            documentation: '当前日期的前一天，年月日之间有横杠分割',
            insertText: '${run_date_std}',
            detail: '系统内嵌变量',
            sortText: 'f',
          }, {
            label: 'run_month_begin',
            documentation: '当前月份的第一天',
            insertText: '${run_month_begin}',
            detail: '系统内嵌变量',
            sortText: 'f',
          }, {
            label: 'run_month_begin_std',
            documentation: '当前月份的第一天，年月日之间有横杠分割',
            insertText: '${run_month_begin_std}',
            detail: '系统内嵌变量',
            sortText: 'f',
          }, {
            label: 'run_month_end',
            documentation: '当前月份的最后一天',
            insertText: '${run_month_end}',
            detail: '系统内嵌变量',
            sortText: 'f',
          }, {
            label: 'run_month_end_std',
            documentation: '当前月份的最后一天，年月日之间有横杠分割',
            insertText: '${run_month_end_std}',
            detail: '系统内嵌变量',
            sortText: 'f',
          },
          {
            label: 'ide.engine.no.limit.allow',
            documentation: '当设置为true时,本次执行的SQL将进行全量导出',
            insertText: 'ide.engine.no.limit.allow',
            detail: 'build-in parameters',
            sortText: 'f',
          },
    ]
}
