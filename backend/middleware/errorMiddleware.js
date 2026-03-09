const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Server error';

  if (err?.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `${duplicateField} is already registered`;
  }

  res.status(statusCode).json({
    message
  });
};

module.exports = errorHandler;
