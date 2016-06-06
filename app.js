const express = require('express');
const morgan = require('morgan');
const gm = require('gm');
const fs = require('fs');
const app = express();

app.use(morgan('combined'))

app.use((err, req, res, next) => {
  if (err.code === 'ENOENT') {
    res.status(404);
    res.end('Not found');
  } else if (err.statusCode) {
    res.status(err.statusCode);
    res.end(err.message);
  } else {
    res.status(500);
    res.end(err.message);
  }
});

function getFormat(f) {
  switch (f) {
    case '.jpg': return 'jpeg';
    case '.gif': return 'gif';
    default: return 'png';
  }
}

app.get(/\/(\d+)(?:x((\d+)))?(.\w+)?/, function (req, res, next) {
  const MAX_DIMENSION = 5000;
  const width = req.params[0];
  const height = req.params[1] || width;
  const color = req.query.color || req.query.color || 'ccc';
  const text = req.query.text || (width + ' x ' + height);
  const textColor = req.query.textColor || req.query.textColor || '000';
  const format = getFormat(req.params[2]);

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const dimensionError = new Error(
      `Maximum dimension exceeded (${MAX_DIMENSION})`
    );

    dimensionError.statusCode = 400;

    return next(dimensionError);
  }

  gm(width, height, `#${color}`)
    .fill('#' + color)
    .gravity('Center')
    .pointSize(30 * (parseInt(Math.min(width, height), 10) / 200))
    .fill('#' + textColor)
    .drawText(0, 0, text)
    .toBuffer('miff', function(bufferErr, buffer) {
      if (bufferErr) return next(bufferErr);

      gm(buffer)
      .composite('assets/watermark.png')
      .gravity('SouthEast')
      .geometry('+20+20')
      .stream(format, function (streamErr, stdout, stderr) {
        if (streamErr) return next(streamErr);

        res.set({ 'Content-Type': 'image/' + format,
          'Cache-Control': 'max-age=315360000,public',
          'Date': new Date().toUTCString(),
          'Last-Modified': new Date().toUTCString(),
        })

        stdout.pipe(res);
        stderr.pipe(process.stdout);
      });
    });
});

app.listen(process.env.PORT || 3002);
