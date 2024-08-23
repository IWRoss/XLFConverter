const fs = require("fs");

// Get all the xliff files in xlf folder and convert them to js and save in js folder
const {
  convertXliffToJs,
  convertJsToXliff,
  convertXliff12ToJs,
  convertJsToCsv,
} = require("./func/convert");

const xliffFolder = "./input";

fs.readdir(xliffFolder, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  files.forEach(async (file) => {
    const xliffPath = `${xliffFolder}/${file}`;

    // If not an xliff file, skip
    if (!xliffPath.endsWith(".xlf")) {
      return;
    }

    const jsData = await convertXliff12ToJs(xliffPath);

    console.log(jsData);

    const jsPath = `./js/${file.replace(".xlf", ".json")}`;

    fs.writeFileSync(jsPath, JSON.stringify(jsData));

    const csvData = convertJsToCsv(jsData);

    console.log(csvData);

    const csvPath = `./output/${file.replace(".xlf", ".csv")}`;

    fs.writeFileSync(csvPath, csvData);

    console.log(`Converted ${xliffPath} to ${csvPath}`);
  });
});
