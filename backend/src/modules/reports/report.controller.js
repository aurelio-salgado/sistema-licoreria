const service = require('./report.service');
async function get(req,res,next){try{res.json({success:true,data:await service.getReport(req.params.type,req.query)});}catch(error){next(error);}}
async function exportReport(req,res,next){try{const file=await service.exportReport(req.params.type,req.query);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition',`attachment; filename="${file.filename}"`);res.status(200).send(file.buffer);}catch(error){next(error);}}
module.exports={exportReport,get};
