module.exports = (directoryPath, fileName) => {
  if (!directoryPath || !fileName) {
    console.error('Required parameters are not provided');
    return;
  }

  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(directoryPath, fileName);

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) {
      console.error('File does not exist:', err);
      return;
    }

    // Remove the file
    fs.unlink(filePath, err => {
      if (err) {
        console.error('Error removing file:', err);
        return;
      }

      console.log('File removed successfully');
      return;
    });
  });
};
