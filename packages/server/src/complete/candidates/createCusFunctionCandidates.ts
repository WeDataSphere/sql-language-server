import { toCompletionItemForCusFunction } from '../CompletionItemUtils'

const CLAUSES = [
   {baseFunction: 'AVG()',desc: 'AVG() 函数返回数值列的平均值。\r\n eg:\r\n SELECT AVG(column_name) FROM table_name'},
   {baseFunction: 'COUNT()',desc: 'COUNT() 函数返回匹配指定条件的行数。\r\n COUNT(column_name) 函数返回指定列的值的数目（NULL 不计入）\r\n eg:SELECT COUNT(column_name) FROM table_name; \r\n COUNT(*) 函数返回表中的记录数 \r\n eg:SELECT COUNT(*) FROM table_name; \r\n COUNT(DISTINCT column_name) 函数返回指定列的不同值的数目 \r\n eg:SELECT COUNT(DISTINCT column_name) FROM table_name; \r\n 注释：COUNT(DISTINCT) 适用于 ORACLE 和 Microsoft SQL Server，但是无法用于 Microsoft Access。'},
   {baseFunction: 'FIRST()',desc: 'FIRST() 函数返回指定的列中第一个记录的值。\r\n eg:SELECT FIRST(column_name) FROM table_name;\r\n 注释：只有 MS Access 支持 FIRST() 函数。'},
   {baseFunction: 'LAST()',desc: 'LAST() 函数返回指定的列中最后一个记录的值。\r\n eg:SELECT LAST(column_name) FROM table_name;\r\n 注释：只有 MS Access 支持 LAST() 函数。'},
   {baseFunction: 'MAX()',desc: 'MAX() 函数返回指定列的最大值。\r\n eg:SELECT MAX(column_name) FROM table_name;'},
   {baseFunction: 'MIN()',desc: 'MIN() 函数返回指定列的最小值。\r\n eg:SELECT MIN(column_name) FROM table_name;'},
   {baseFunction: 'SUM()',desc: 'SUM() 函数返回数值列的总数。\r\n eg:SELECT SUM(column_name) FROM table_name;'},
   {baseFunction: 'UCASE()',desc: 'UCASE() 函数把字段的值转换为大写。\r\n eg:SELECT UCASE(column_name) FROM table_name;'},
   {baseFunction: 'LCASE()',desc: 'LCASE() 函数把字段的值转换为小写。\r\n eg:SELECT LCASE(column_name) FROM table_name;'},
   {baseFunction: 'MID()',desc: 'MID() 函数用于从文本字段中提取字符。\r\n eg:SELECT MID(column_name,start[,length]) FROM table_name;'},
   {baseFunction: 'LEN()',desc: 'LEN() 函数返回文本字段中值的长度。\r\n eg:SELECT LEN(column_name) FROM table_name;'},
   {baseFunction: 'ROUND()',desc: 'ROUND() 函数用于把数值字段舍入为指定的小数位数。\r\n eg:SELECT ROUND(column_name,decimals) FROM TABLE_NAME;'},
   {baseFunction: 'NOW()',desc: 'NOW() 函数返回当前系统的日期和时间。\r\n eg:SELECT NOW() FROM table_name;'},
   {baseFunction: 'FORMAT()',desc: 'FORMAT() 函数用于对字段的显示进行格式化。\r\n eg:SELECT FORMAT(column_name,format) FROM table_name;'},
   {baseFunction: 'SUBSTRING()',desc: 'SUBSTRING()有两种语法形式substring(string ，index)|substring(string from index) \r\n 一种是两个参数获取从某个序号开始的值\r\n eg:select substring(\'hello world\',-5)  \r\n 另一种是三个参数获取指定位置和个数的字符串。\r\n eg:select substring(\'My name is LiMing\',-6,2);'},
   {baseFunction: 'TRIM()',desc: 'TRIM() 函数将所有字串起头和结尾的空白移除。\r\n eg:SELECT TRIM(\'  sample  \');'},
   {baseFunction: 'LTRIM()',desc: 'LTRIM() 函数将所有字串起头的空白移除。\r\n eg:SELECT TRIM(\'  sample\');'},
   {baseFunction: 'RTRIM()',desc: 'RTRIM() 函数将所有字串结尾的空白移除。。\r\n eg:SELECT TRIM(\'sample  \');'},
   {baseFunction: 'REPLACE()',desc: 'REPLACE() REPLACE 函数 用给定的新字符或子字符串替换原始字符串中所有出现的这些字符。此函数还将列的值替换为新值。\r\n 语法 1：此语法使用带有 SQL 表列名的 REPLACE 函数 \r\n eg:SELECT REPLACE(Column_Name, Character/string_to_replace, new_String/character ) AS Alias_Name FROM Table_Name; \r\n 语法 2：此语法使用带有字符串的 REPLACE 函数 \r\n eg:SELECT REPLACE(Original_String, String_to_Replace, New_String) AS Alias_Name; \r\n 语法 3：此语法使用带有单个字符的 REPLACE 函数 \r\n eg:SELECT REPLACE(Original_String, character_to_Replace, New_Character) AS Alias_Name; '},
   {baseFunction: 'REVERSE()',desc: 'REVERSE() 函数以相反的顺序返回字符串。它在查询输出的第一个位置显示字符串的最后一个字符，在最后一个位置显示第一个字符。\r\n eg:SELECT REVERSE (Column_Name) AS Alias_Name FROM Table_Name;'},
   {baseFunction: 'CONCAT()',desc: 'CONCAT() 添加两个或多个字符或字符串以在结果中形成一个新字符串。如果您在函数中只传递一个字符串，那么它会在输出中显示错误。因此，CONCAT() 函数至少需要两个字符串。\r\n eg:SELECT CONCAT(Column_Name1, column_Name2, Column_Name3,....... Column_NameN) AS Alias_Name FROM Table_Name; '},
   {baseFunction: 'ABS()',desc: 'ABS() 函数返回特定数字的绝对值。\r\n eg:SELECT ABS(5) AS ABS_5; '},  
   {baseFunction: 'SQRT()',desc: 'SQRT() 函数给定数字的平方根。假设数字是 25，那么这个函数返回 5。\r\n eg:SELECT SQRT(Number) AS Alias_Name; '}, 
   {baseFunction: 'OCT()',desc: 'OCT() 函数将给定的十进制数转换为其等效的八进制数。\r\n eg:SELECT OCT(Decimal_Number) AS Alias_Name; '}, 
   {baseFunction: 'BIN()',desc: 'BIN() 函数将给定的十进制数转换为其等效的二进制数。如果在函数中传递了 NULL，则此函数返回 NULL。\r\n eg:SELECT BIN(Decimal_Number) AS Alias_Name; '}, 
   {baseFunction: 'ADDDATE()',desc: 'ADDDATE() 函数增加日期。\r\n eg:SELECT DATE_ADD(\'1998-01-02\', INTERVAL 31 DAY); '}, 
   {baseFunction: 'ABADDTIME()',desc: 'ADDTIME(expr1,expr2) 将 expr2 加到 expr1 上，并返回结果。expr1 为 time 或者 datetime 表达式，expr2 为 time 表达式。\r\n eg:SELECT ADDTIME(\'1997-12-31 23:59:59.999999\',\'1 1:1:1.000002\');'}, 
   {baseFunction: 'CONVERT_TZ()',desc: 'CONVERT_TZ(dt,from_tz,to_tz) 函数将 datetime 类型的值 dt 的时区从 from_dt 转换为 to_dt，并返回结果。如果参数无效，则函数返回 NULL。\r\n eg:SELECT CONVERT_TZ(\'2004-01-01 12:00:00\',\'GMT\',\'MET\');'}, 
   {baseFunction: 'CURDATE()',desc: 'CURDATE() 以 \'YYYY-MM-DD\'（字符串） 或者 YYYYMMDD（数值） 的形式返回当前日期， 具体形式取决于函数处于字符串还是数值型的上下文环境中。\r\n eg:SELECT CURDATE();'}, 
   {baseFunction: 'CURTIME()',desc: 'CURTIME() 以 \'HH:MM:SS\'（字符串） 或者 HHMMSS（数值） 的形式返回当前时间， 具体形式取决于函数处于字符串还是数值型的上下文环境中。该函数按照当前时区来表示返回值。\r\n eg:SELECT CURTIME();'}, 
   {baseFunction: 'DATE()',desc: 'DATE(expr) 提取 date 表达式或者 datetime 表达式中的日期部分。\r\n eg:SELECT DATE(\'2003-12-31 01:02:03\'); '}, 
   {baseFunction: 'DATEDIFF()',desc: 'DATEDIFF(expr1,expr2) 返回 expr1 和 expr2 的差，以天数的形式表示。expr1 和 expr2 应为 date 或者 datetime 表达式。只有参数的日期部分参与了计算。\r\n eg:SELECT DATEDIFF(\'1997-12-31 23:59:59\',\'1997-12-30\');'}, 
   {baseFunction: 'DATE_FORMAT()',desc: 'DATE_FORMAT(date,format) 根据格式字符串对日期值进行格式化。\r\n eg:SELECT DATE_FORMAT(\'1997-10-04 22:23:00\', \'%W %M %Y\')'}, 
   {baseFunction: 'DAYNAME()',desc: 'DAYNAME(date)返回 date 在星期中的名称。\r\n eg:SELECT DAYNAME(\'1998-02-05\');'}, 
   {baseFunction: 'DAYOFMONTH()',desc: 'DAYOFMONTH(date) 返回 date 是当月的第几天，范围为 0 到 31。\r\n eg:SELECT DAYOFMONTH(\'1998-02-03\');'}, 
   {baseFunction: 'DAYOFWEEK()',desc: 'DAYOFWEEK(date) 返回 date 是其所在星期的第几天(1 = Sunday, 2 = Monday,.., 7 = Saturday)，这里一星期中日期的名称与数字的对应关系符合 ODBC 标准。\r\n eg:SELECT DAYOFWEEK(\'1998-02-03\');'}, 
   {baseFunction: 'DAYOFYEAR()',desc: 'DAYOFYEAR(date) 返回 date 是当年的第几天，范围为 1 到 366。\r\n eg:SELECT DAYOFYEAR(\'1998-02-03\');'}, 
   {baseFunction: 'FROM_DAYS()',desc: 'FROM_DAYS(N) 给出天数 N，返回 DATE 值。\r\n eg:SELECT FROM_DAYS(729669);'}, 
   {baseFunction: 'HOUR()',desc: 'HOUR(time)返回时间值的小时部分。对于一天中的时间来说，返回值的范围为 0 到 23。不过，TIME 类型的值可以大得多，所以 HOUR 函数可以返回比 23 大的值。\r\n eg:SELECT HOUR(\'10:05:03\');'}, 
   {baseFunction: 'LAST_DAY()',desc: 'LAST_DAY(date) 返回 date 或者 datetime 值所在月份的最后一天。如果参数无效的话，返回　NULL。\r\n eg:SELECT LAST_DAY(\'2003-02-05\');'}, 
   {baseFunction: 'MAKEDATE()',desc: 'MAKEDATE(year,dayofyear) 给定年份和（某天在一年中）的天数，返回对应的日期值。天数必须大于 0，否则返回值为 NULL。\r\n eg:SELECT MAKEDATE(2001,31), MAKEDATE(2001,32);'}, 
   {baseFunction: 'MAKETIME()',desc: 'MAKETIME(hour,minute,second) 根据参数给出的时、分、秒，返回对应的时间值。\r\n eg:SELECT MAKETIME(12,15,30); '}, 
   {baseFunction: 'MICROSECOND()',desc: 'MICROSECOND(expr) 根据 time 或者 datetime 表达式 expr，返回微秒数，结果在 0 到 999999 之间。\r\n eg:SELECT MICROSECOND(\'12:00:00.123456\');'}, 
   {baseFunction: 'MINUTE()',desc: 'MINUTE(time)返回时间型值中的分钟部分，范围为 0 到 59。\r\n eg:SELECT MINUTE(\'1998-02-03 10:05:03\');'}, 
   {baseFunction: 'MONTH()',desc: 'MONTH(date) 返回日期型值中的月份，范围为 0 到 12。\r\n eg:SELECT MONTH(\'1998-02-03\')'}, 
   {baseFunction: 'MONTHNAME()',desc: 'MONTHNAME(date) 返回日期型值所处月份的全名。\r\n eg:SELECT MONTHNAME(\'1998-02-05\');'}, 
   {baseFunction: 'PERIOD_ADD()',desc: 'PERIOD_ADD(P,N) 在时间 P（格式为 YYMM 或者 YYYYMM）上加上 N 个月，结果格式为 YYYYMM。注意，时间参数 P 并不是日期型值。\r\n eg:SELECT PERIOD_ADD(9801,2);'}, 
   {baseFunction: 'PERIOD_DIFF()',desc: 'PERIOD_DIFF(P1,P2) 返回时间 P1 和 P2 之间相差的月份。 P1 和 P2 的格式应为 YYMM 或者 YYYYMM。注意I，P1 和 P2 不是日期型值。\r\n eg:SELECT PERIOD_DIFF(9802,199703);'}, 
   {baseFunction: 'QUARTER()',desc: 'QUARTER(date) 返回日期型值 date 所处的季度值，范围为 1 到 4。\r\n eg:SELECT QUARTER(\'98-04-01\');'}, 
   {baseFunction: 'SECOND()',desc: 'SECOND(time) 返回时间型值中秒的部分，范围为 0 到 59。\r\n eg:SELECT SECOND(\'10:05:03\');'}, 
   {baseFunction: 'STR_TO_DATE()',desc: 'STR_TO_DATE(str,format) 这是 DATE_FORMATE() 函数的逆函数，其参数为表示时间和日期的字符串 str 和一个格式字符串 format。如果格式字符串中既有日期又有时间，则 STR_TO_DATE() 返回 DATETIME() 型的值，否则返回日期型（DATE）或者时间型（TIME）的值。\r\n eg:SELECT STR_TO_DATE(\'04/31/2004\', \'%m/%d/%Y\');'}, 
   {baseFunction: 'TIME_FORMAT()',desc: 'TIME_FORMAT(time,format) 该函数使用起来类似 DATE_FORMAT() 函数，但是格式字符串 format 中只能有与小时、分钟和秒有关的那些占位符。如果时间型值的小时部分大于 23，则 %H 和 %k 格式占位符将会产生一个大于通常的 0-23 的值，其他与小时有关的占位符则会返回小时值除以 12 后的余数（modulo 12）。\r\n eg:SELECT TIME_FORMAT(\'100:00:00\', \'%H %k %h %I %l\');'}, 
   {baseFunction: 'TIME_TO_SEC()',desc: 'TIME_TO_SEC(time) 将时间型值转换为秒。\r\n eg:SELECT TIME_TO_SEC(\'22:23:00\');'}, 
   {baseFunction: 'TO_DAYS()',desc: 'TO_DAYS(date) 给定日期型值 date，返回天数（自公元 0 年以来的天数）。\r\n eg:SELECT TO_DAYS(950501);'}, 
]

export function createCusFunctionCandidates() {
  return CLAUSES.map((v) => toCompletionItemForCusFunction(v.baseFunction,v.desc))
}

