const service = require('./publicCatalog.service');

async function list(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.list(req.query) }); }
  catch (error) { next(error); }
}

async function image(req, res, next) {
  try {
    const result = await service.image(req.params.filename);
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': 'inline',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.status(200).send(result.buffer);
  } catch (error) { next(error); }
}
async function brandImage(req, res, next) {
  try {
    const result = await service.brandImage(req.params.filename);
    res.set({ 'Content-Type': result.contentType, 'Content-Disposition': 'inline', 'Cross-Origin-Resource-Policy': 'cross-origin', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.status(200).send(result.buffer);
  } catch (error) { next(error); }
}

module.exports = { brandImage, image, list };
