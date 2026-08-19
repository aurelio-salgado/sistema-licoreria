const pool = require('../../config/database');
const repository = require('./report.repository');
const { reportQuery } = require('./report.validation');
const { buildWorkbook } = require('./report.exporter');
const EXPORT_LIMIT = 10000;
async function getReport(type, query) { const filters=reportQuery(type,query), result=await repository.list(pool,filters); return { type,filters:{ date_from:filters.dateFrom,date_to:filters.dateTo,status:filters.status,product:filters.product,seller:filters.seller,supplier:filters.supplier },rows:result.rows,pagination:{page:filters.page,limit:filters.limit,total:result.total,total_pages:Math.ceil(result.total/filters.limit)} }; }
async function exportReport(type, query) {
  const filters=reportQuery(type,query),rows=await repository.listAll(pool,filters,EXPORT_LIMIT);
  if(rows.length>EXPORT_LIMIT){const error=new Error(`La exportación supera el límite de ${EXPORT_LIMIT} filas. Ajusta los filtros.`);error.statusCode=413;throw error;}
  const exportedFilters={dateFrom:filters.dateFrom,dateTo:filters.dateTo,status:filters.status,product:filters.product,seller:filters.seller,supplier:filters.supplier};
  const {workbook,filename}=buildWorkbook(type,rows,exportedFilters),buffer=await workbook.xlsx.writeBuffer();
  return {buffer,filename,rowCount:rows.length};
}
module.exports = { EXPORT_LIMIT, exportReport, getReport };
