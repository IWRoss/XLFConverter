const fs = require("fs");

// Get all the xliff files in xlf folder and convert them to js and save in js folder
const { convertJsToXliff12, convertCsvToJs } = require("./func/convert");

const csvFolder = "./input";

fs.readdir(csvFolder, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  files.forEach(async (file) => {
    const csvPath = `${csvFolder}/${file}`;

    // If not an xliff file, skip
    if (!csvPath.endsWith(".csv")) {
      return;
    }

    const jsData = convertCsvToJs(csvPath);

    // Write to js file in js folder
    const jsPath = `./js/${file.replace(".csv", ".json")}`;

    fs.writeFileSync(jsPath, JSON.stringify(jsData, null, 2));

    // console.dir(jsData, { depth: null });

    const csvData = await convertJsToXliff12(jsData);

    const xliffPath = `./output/${file.replace(".csv", ".xlf")}`;

    fs.writeFileSync(xliffPath, csvData);

    console.log(`Converted ${csvPath} to ${xliffPath}`);
  });
});
