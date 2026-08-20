const service=require('./backup.service');
const actor=req=>({userId:req.user.id_usuario,ipAddress:req.ip});
async function list(req,res,next){try{res.json({success:true,data:await service.list(req.query)});}catch(e){next(e);}}
async function get(req,res,next){try{res.json({success:true,data:{backup:await service.get(req.params.id)}});}catch(e){next(e);}}
async function create(req,res,next){try{res.status(201).json({success:true,data:{backup:await service.create(req.body,actor(req))}});}catch(e){next(e);}}
async function download(req,res,next){try{const file=await service.download(req.params.id);res.setHeader('Content-Type','application/sql');res.setHeader('Content-Disposition',`attachment; filename="${file.filename}"`);res.sendFile(file.file,error=>{if(error&&!res.headersSent)next(error);});}catch(e){next(e);}}
async function restore(req,res,next){try{res.json({success:true,data:{restoration:await service.restore(req.params.id,req.body,actor(req))}});}catch(e){next(e);}}
module.exports={create,download,get,list,restore};
