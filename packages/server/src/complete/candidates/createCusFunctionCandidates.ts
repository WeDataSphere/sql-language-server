import { toCompletionItemForCusFunction } from '../CompletionItemUtils'
import { MarkupKind } from 'vscode-languageserver-types'

const CLAUSES = [
   {
     baseFunction:'AVG()',
     desc:{
       kind: MarkupKind.Markdown,
       value: "`AVG()`函数返回数值列的平均值。   \r\n eg:   \r\n````sql   \r\n SELECT AVG(column_name) FROM table_name;    \r\n````"
     }
   },
   {
    baseFunction:'COUNT()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`COUNT()`函数返回匹配指定条件的行数。   \r\n COUNT(column_name) 函数返回指定列的值的数目（NULL 不计入）   \r\n eg:   \r\n````sql   \r\n SELECT COUNT(column_name) FROM table_name;   \r\n COUNT(*) -- 函数返回表中的记录数 \r\n SELECT COUNT(*) FROM table_name;   \r\n COUNT(DISTINCT column_name) -- 函数返回指定列的不同值的数目   \r\n SELECT COUNT(DISTINCT column_name) FROM table_name;   \r\n````   \n\r **注释：** `COUNT(DISTINCT)` 适用于 ORACLE 和 Microsoft SQL Server，但是无法用于 Microsoft Access。"
    }
   },
   {
    baseFunction:'FIRST()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`FIRST()`函数返回指定的列中第一个记录的值。   \r\n eg:   \r\n````sql   \r\n SELECT FIRST(column_name) FROM table_name;   \r\n````   \r\n **注释：** 只有 MS Access 支持 FIRST() 函数。"
    }
   },
   {
    baseFunction:'LAST()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`LAST()`函数返回指定的列中最后一个记录的值。   \r\n eg:   \r\n````sql   \r\n SELECT LAST(column_name) FROM table_name;    \r\n````   \r\n **注释：** 只有 MS Access 支持 LAST() 函数。"
    }
   },
   {
    baseFunction:'MAX()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`MAX()`函数返回指定列的最大值。   \r\n eg:   \r\n````sql   \r\n SELECT MAX(column_name) FROM table_name;   \r\n````"
    }
   },
   {
    baseFunction:'MIN()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`MIN()`函数返回指定列的最小值。   \r\n eg:   \r\n````sql   \r\n SELECT MIN(column_name) FROM table_name;   \r\n````"
    }
   },
   {
    baseFunction:'SUM()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`SUM()`函数返回数值列的总数。   \r\n eg:   \r\n````sql   \r\n SELECT SUM(column_name) FROM table_name;   \r\n````"
    }
   },
   {
    baseFunction:'UCASE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`UCASE()`函数把字段的值转换为大写。   \r\n eg:   \r\n````sql   \r\n SELECT UCASE(column_name) FROM table_name;   \r\n````"
    }
   },
   {
    baseFunction:'LCASE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`LCASE()`函数把字段的值转换为小写。   \r\n eg:   \r\n````sql   \r\n SELECT LCASE(column_name) FROM table_name;   \r\n````"
    }
   },
   {
    baseFunction:'MID()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`MID()`函数用于从文本字段中提取字符。   \r\n eg:   \r\n````sql   \r\n SELECT MID(column_name,start[,length]) FROM table_name;   \r\n````"
    }
   },
   {
    baseFunction:'LEN()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`LEN()`函数返回文本字段中值的长度。   \r\n eg:   \r\n````sql   \r\n SELECT LEN(column_name) FROM table_name;   \r\n````"
    }
   },
   {
    baseFunction:'ROUND()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`ROUND()`函数用于把数值字段舍入为指定的小数位数。   \r\n eg:   \r\n````sql   \r\n SELECT ROUND(column_name,decimals) FROM TABLE_NAME;   \r\n````"
    }
   },
   {
    baseFunction:'NOW()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`NOW()`函数返回当前系统的日期和时间。   \r\n eg:   \r\n````sql   \r\n SELECT NOW() FROM table_name;   \r\n````"
    }
   },
   {
    baseFunction:'FORMAT()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`FORMAT()`函数用于对字段的显示进行格式化。   \r\n eg:   \r\n````sql   \r\n SELECT FORMAT(column_name,format) FROM table_name;   \r\n````"
    }
   },
   {
    baseFunction:'SUBSTRING()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`SUBSTRING()`有两种语法形式substring(string ，index)|substring(string from index)。   \r\n   一种是两个参数获取从某个序号开始的值   \r\n eg:   \r\n ````sql   \r\n select substring(\'hello world\',-5);   \r\n````   \r\n 另一种是三个参数获取指定位置和个数的字符串。   \r\n   eg:   \r\n ````sql   \r\n select substring(\'My name is LiMing\',-6,2);   \r\n ````"
    }
   },
   {
    baseFunction:'TRIM()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`TRIM()`函数将所有字串起头和结尾的空白移除。   \r\n eg:   \r\n````sql   \r\n SELECT TRIM(\'  sample  \');   \r\n````"
    }
   },
   {
    baseFunction:'RTRIM()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`RTRIM()`函数将所有字串结尾的空白移除。   \r\n eg:   \r\n````sql   \r\n SELECT TRIM(\'sample  \');   \r\n````"
    }
   },
   {
    baseFunction:'REPLACE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`REPLACE()`函数用给定的新字符或子字符串替换原始字符串中所有出现的这些字符。此函数还将列的值替换为新值。   \r\n   语法 1：此语法使用带有 SQL 表列名的 REPLACE 函数   \r\n eg:   \r\n````sql   \r\n SELECT REPLACE(Column_Name, Character/string_to_replace, new_String/character ) AS Alias_Name FROM Table_Name;   \r\n````   \r\n 语法 2：此语法使用带有字符串的 REPLACE 函数   \r\n ````sql   \r\n SELECT REPLACE(Original_String, String_to_Replace, New_String) AS Alias_Name;   \r\n ````   \r\n 语法 3：此语法使用带有单个字符的 REPLACE 函数   \r\n ````sql   \r\n SELECT REPLACE(Original_String, character_to_Replace, New_Character) AS Alias_Name;   \r\n````"
    }
   },
   {
    baseFunction:'REVERSE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`REVERSE()`函数以相反的顺序返回字符串。它在查询输出的第一个位置显示字符串的最后一个字符，在最后一个位置显示第一个字符。   \r\n eg:   \r\n````sql   \r\n SELECT REVERSE (Column_Name) AS Alias_Name FROM Table_Name;   \r\n````"
    }
   },
   {
    baseFunction:'CONCAT()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`CONCAT()` 添加两个或多个字符或字符串以在结果中形成一个新字符串。如果您在函数中只传递一个字符串，那么它会在输出中显示错误。因此，`CONCAT()` 函数至少需要两个字符串。   \r\n eg:   \r\n````sql   \r\n SELECT CONCAT(Column_Name1, column_Name2, Column_Name3,....... Column_NameN) AS Alias_Name FROM Table_Name;   \r\n````"
    }
   },
   {
    baseFunction:'ABS()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`ABS()`函数返回特定数字的绝对值。   \r\n eg:   \r\n````sql   \r\n SELECT ABS(5) AS ABS_5;   \r\n````"
    }
   },
   {
    baseFunction:'SQRT()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`SQRT()`函数给定数字的平方根。假设数字是 25，那么这个函数返回 5。   \r\n eg:   \r\n````sql   \r\n SELECT SQRT(Number) AS Alias_Name;   \r\n````"
    }
   },
   {
    baseFunction:'OCT()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`OCT()`函数将给定的十进制数转换为其等效的八进制数。   \r\n eg:   \r\n````sql   \r\n SELECT OCT(Decimal_Number) AS Alias_Name;    \r\n````"
    }
   },
   {
    baseFunction:'BIN()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`BIN()`函数将给定的十进制数转换为其等效的二进制数。如果在函数中传递了 NULL，则此函数返回 NULL。   \r\n eg:   \r\n````sql   \r\n SELECT BIN(Decimal_Number) AS Alias_Name;   \r\n````"
    }
   },
   {
    baseFunction:'ADDDATE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`ADDDATE()`函数增加日期。   \r\n eg:   \r\n````sql   \r\n SELECT DATE_ADD(\'1998-01-02\', INTERVAL 31 DAY);   \r\n````"
    }
   },
   {
    baseFunction:'ABADDTIME()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`ADDTIME(expr1,expr2)`将 expr2 加到 expr1 上，并返回结果。expr1 为 time 或者 datetime 表达式，expr2 为 time 表达式。   \r\n eg:   \r\n````sql   \r\n SELECT ADDTIME(\'1997-12-31 23:59:59.999999\',\'1 1:1:1.000002\');   \r\n````"
    }
   },
   {
    baseFunction:'CONVERT_TZ()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`CONVERT_TZ(dt,from_tz,to_tz) `函数将 datetime 类型的值 dt 的时区从 from_dt 转换为 to_dt，并返回结果。如果参数无效，则函数返回 NULL。   \r\n eg:   \r\n````sql   \r\n SELECT CONVERT_TZ(\'2004-01-01 12:00:00\',\'GMT\',\'MET\');   \r\n````"
    }
   },
   {
    baseFunction:'CURDATE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`CURDATE()`以 \'YYYY-MM-DD\'（字符串） 或者 YYYYMMDD（数值） 的形式返回当前日期， 具体形式取决于函数处于字符串还是数值型的上下文环境中。   \r\n eg:   \r\n````sql   \r\n SELECT CURDATE();   \r\n````"
    }
   },
   {
    baseFunction:'CURTIME()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`CURTIME()`以 \'HH:MM:SS\'（字符串） 或者 HHMMSS（数值） 的形式返回当前时间， 具体形式取决于函数处于字符串还是数值型的上下文环境中。该函数按照当前时区来表示返回值。   \r\n eg:   \r\n````sql   \r\n SELECT CURTIME();   \r\n````"
    }
   },
   {
    baseFunction:'DATE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`DATE(expr)`提取 date 表达式或者 datetime 表达式中的日期部分。   \r\n eg:   \r\n````sql   \r\n SELECT DATE(\'2003-12-31 01:02:03\');   \r\n````"
    }
   },
   {
    baseFunction:'DATEDIFF()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`DATEDIFF(expr1,expr2)`返回 expr1 和 expr2 的差，以天数的形式表示。expr1 和 expr2 应为 date 或者 datetime 表达式。只有参数的日期部分参与了计算。   \r\n eg:   \r\n````sql   \r\n SELECT DATEDIFF(\'1997-12-31 23:59:59\',\'1997-12-30\');   \r\n````"
    }
   },
   {
    baseFunction:'DATE_FORMAT()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`DATE_FORMAT(date,format)`根据格式字符串对日期值进行格式化。   \r\n eg:   \r\n````sql   \r\n SELECT DATE_FORMAT(\'1997-10-04 22:23:00\', \'%W %M %Y\');   \r\n````"
    }
   },
   {
    baseFunction:'DAYNAME()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`DAYNAME(date)`返回 date 在星期中的名称。   \r\n eg:   \r\n````sql   \r\n SELECT DAYNAME(\'1998-02-05\');   \r\n````"
    }
   },
   {
    baseFunction:'DAYOFMONTH()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`DAYOFMONTH(date)`返回 date 是当月的第几天，范围为 0 到 31。   \r\n eg:   \r\n````sql   \r\n SELECT DAYOFMONTH(\'1998-02-03\');   \r\n````"
    }
   },
   {
    baseFunction:'DAYOFWEEK()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`DAYOFWEEK(date)`返回 date 是其所在星期的第几天(1 = Sunday, 2 = Monday,.., 7 = Saturday)，这里一星期中日期的名称与数字的对应关系符合 ODBC 标准。   \r\n eg:   \r\n````sql   \r\n SELECT DAYOFWEEK(\'1998-02-03\');   \r\n````"
    }
   },
   {
    baseFunction:'DAYOFYEAR()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`DAYOFYEAR(date)`返回 date 是当年的第几天，范围为 1 到 366。   \r\n eg:   \r\n````sql   \r\n SELECT DAYOFYEAR(\'1998-02-03\');   \r\n````"
    }
   },
   {
    baseFunction:'FROM_DAYS()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`FROM_DAYS(N)`给出天数 N，返回 DATE 值。   \r\n eg:   \r\n````sql   \r\n SELECT FROM_DAYS(729669);   \r\n````"
    }
   },
   {
    baseFunction:'HOUR()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`HOUR(time)`返回时间值的小时部分。对于一天中的时间来说，返回值的范围为 0 到 23。不过，TIME 类型的值可以大得多，所以 HOUR 函数可以返回比 23 大的值。   \r\n eg:   \r\n````sql   \r\n SELECT HOUR(\'10:05:03\');   \r\n````"
    }
   },
   {
    baseFunction:'LAST_DAY()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`LAST_DAY(date)`返回 date 或者 datetime 值所在月份的最后一天。如果参数无效的话，返回NULL。   \r\n eg:   \r\n````sql   \r\n SELECT LAST_DAY(\'2003-02-05\');   \r\n````"
    }
   },
   {
    baseFunction:'MAKEDATE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`MAKEDATE(year,dayofyear)`给定年份和（某天在一年中）的天数，返回对应的日期值。天数必须大于 0，否则返回值为 NULL。   \r\n eg:   \r\n````sql   \r\n SELECT MAKEDATE(2001,31), MAKEDATE(2001,32);   \r\n````"
    }
   },
   {
    baseFunction:'MAKETIME()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`MAKETIME(hour,minute,second)`根据参数给出的时、分、秒，返回对应的时间值。   \r\n eg:   \r\n````sql   \r\n SELECT MAKETIME(12,15,30);   \r\n````"
    }
   },
   {
    baseFunction:'MICROSECOND()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`MICROSECOND(expr)`根据 time 或者 datetime 表达式 expr，返回微秒数，结果在 0 到 999999 之间。   \r\n eg:   \r\n````sql   \r\n SELECT MICROSECOND(\'12:00:00.123456\');   \r\n````"
    }
   },
   {
    baseFunction:'MINUTE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`MINUTE(time)`返回时间型值中的分钟部分，范围为 0 到 59。   \r\n eg:   \r\n````sql   \r\n SELECT MINUTE(\'1998-02-03 10:05:03\');   \r\n````"
    }
   },
   {
    baseFunction:'MONTH()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`MONTH(date)`返回日期型值中的月份，范围为 0 到 12。   \r\n eg:   \r\n````sql   \r\n SELECT MONTH(\'1998-02-03\');   \r\n````"
    }
   },
   {
    baseFunction:'MONTHNAME()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`MONTHNAME(date)`返回日期型值所处月份的全名。   \r\n eg:   \r\n````sql   \r\n SELECT MONTHNAME(\'1998-02-05\');   \r\n````"
    }
   },
   {
    baseFunction:'PERIOD_ADD()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`PERIOD_ADD(P,N)`在时间 P（格式为 YYMM 或者 YYYYMM）上加上 N 个月，结果格式为 YYYYMM。注意，时间参数 P 并不是日期型值。   \r\n eg:   \r\n````sql   \r\n SELECT PERIOD_ADD(9801,2);   \r\n````"
    }
   },
   {
    baseFunction:'PERIOD_DIFF()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`PERIOD_DIFF(P1,P2)`返回时间 P1 和 P2 之间相差的月份。 P1 和 P2 的格式应为 YYMM 或者 YYYYMM。注意I，P1 和 P2 不是日期型值。   \r\n eg:   \r\n````sql   \r\n SELECT PERIOD_DIFF(9802,199703);   \r\n````"
    }
   },
   {
    baseFunction:'QUARTER()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`QUARTER(date)`返回日期型值 date 所处的季度值，范围为 1 到 4。   \r\n eg:   \r\n````sql   \r\n SELECT QUARTER(\'98-04-01\');   \r\n````"
    }
   },
   {
    baseFunction:'SECOND()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`SECOND(time)`返回时间型值中秒的部分，范围为 0 到 59。   \r\n eg:   \r\n````sql   \r\n SELECT SECOND(\'10:05:03\');   \r\n````"
    }
   },
   {
    baseFunction:'STR_TO_DATE()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`STR_TO_DATE(str,format)`这是 DATE_FORMATE() 函数的逆函数，其参数为表示时间和日期的字符串 str 和一个格式字符串 format。如果格式字符串中既有日期又有时间，则 STR_TO_DATE() 返回 DATETIME() 型的值，否则返回日期型（DATE）或者时间型（TIME）的值。   \r\n eg:   \r\n````sql   \r\n SELECT STR_TO_DATE(\'04/31/2004\', \'%m/%d/%Y\');   \r\n````"
    }
   },
   {
    baseFunction:'TIME_FORMAT()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`TIME_FORMAT(time,format)`该函数使用起来类似 DATE_FORMAT() 函数，但是格式字符串 format 中只能有与小时、分钟和秒有关的那些占位符。如果时间型值的小时部分大于 23，则 %H 和 %k 格式占位符将会产生一个大于通常的 0-23 的值，其他与小时有关的占位符则会返回小时值除以 12 后的余数（modulo 12）。   \r\n eg:   \r\n````sql   \r\n SELECT TIME_FORMAT(\'100:00:00\', \'%H %k %h %I %l\');   \r\n````"
    }
   },
   {
    baseFunction:'TIME_TO_SEC()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`TIME_TO_SEC(time)`将时间型值转换为秒。   \r\n eg:   \r\n````sql   \r\n SELECT TIME_TO_SEC(\'22:23:00\');   \r\n````"
    }
   },
   {
    baseFunction:'TO_DAYS()',
    desc:{
      kind: MarkupKind.Markdown,
      value: "`TO_DAYS(date)`给定日期型值 date，返回天数（自公元 0 年以来的天数）。   \r\n eg:   \r\n````sql   \r\n SELECT TO_DAYS(950501);   \r\n````"
    }
   },
]

export function createCusFunctionCandidates() {
  return CLAUSES.map((v) => toCompletionItemForCusFunction(v.baseFunction,v.desc))
}


