// Attaches a consistent success responder to the response object
module.exports = function responseHandler(req, res, next) {
  res.success = (data = null, message = 'OK') => {
    res.json({ success: true, data, message });
  };
  next();
};
