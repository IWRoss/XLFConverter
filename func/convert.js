const fs = require("fs");

const xliff = require("xliff");

const papaparse = require("papaparse");

const convertXliffToJs = async (xliffPath) => {
  const xliffData = fs.readFileSync(xliffPath, "utf8");
  const jsData = await xliff.xliff2js(xliffData);
  return jsData;
};

const convertXliff12ToJs = async (xliffPath) => {
  const xliffData = fs.readFileSync(xliffPath, "utf8");
  const jsData = await xliff.xliff12ToJs(xliffData);
  return jsData;
};

const convertJsToXliff = async (jsData) => {
  const xliffData = await xliff.js2xliff(jsData);
  return xliffData;
};

const convertJsToXliff12 = async (jsData) => {
  const xliffData = await xliff.jsToXliff12(jsData);
  return xliffData;
};

/**
 * Process unit
 */
function flattenGenericSpans(obj, path = "", level = 0) {
  if (typeof obj !== "object" || obj === null) {
    return []; // Guard clause for non-object or null values
  }

  if (!obj.GenericSpan) {
    // Guard clause for objects that don't have a GenericSpan
    return Object.keys(obj).reduce((acc, key) => {
      const newPath = path ? `${path}.${key}` : `root[${key}]`;

      if (typeof obj[key] === "string") {
        return acc.concat(flattenGenericSpans(obj[key], newPath, level));
      }

      return acc.concat(
        flattenGenericSpans(obj[key], newPath + ".GenericSpan", level)
      );
    }, []);
  }

  // If we have a GenericSpan, create the flattened span with metadata
  const spanWithMeta = {
    ...obj.GenericSpan,
    path: path || "root.GenericSpan.contents.GenericSpan",
    level: level,
  };

  // Initialize the array with the current span
  let result = [spanWithMeta];

  if (!obj.GenericSpan.contents) {
    return result; // Guard clause if there are no contents
  }

  if (Array.isArray(obj.GenericSpan.contents)) {
    // Recursively process each item in the contents array
    obj.GenericSpan.contents.forEach((content, index) => {
      const newPath = `${path}.contents[${index}]`;
      if (typeof content === "string") {
        // If content is a string, create a span object for it
        result.push({
          contents: content,
          path: newPath,
          level: level + 1,
        });
      } else {
        // If content is an object, recurse into it
        result = result.concat(
          flattenGenericSpans(content, newPath + ".GenericSpan", level + 1)
        );
      }
    });
  } else if (typeof obj.GenericSpan.contents === "object") {
    // If contents is an object, recurse into it
    const newPath = path
      ? `${path}.contents.GenericSpan`
      : "root.GenericSpan.contents.GenericSpan.contents.GenericSpan";
    result = result.concat(
      flattenGenericSpans(obj.GenericSpan.contents, newPath, level + 1)
    );
  }

  return result;
}

/**
 *
 */
const convertJsToCsv = (jsData) => {
  // Let's get a list of files
  const files = Object.keys(jsData.resources);

  const units = [];

  files.forEach((fileName) => {
    const file = jsData.resources[fileName];

    const unitKeys = Object.keys(file);

    unitKeys.forEach((unit) => {
      const source = file[unit].source;
      const target = file[unit].target;

      units.push({
        file: fileName,
        unit,
        source,
        target,
      });
    });
  });

  const spans = [];

  units.forEach((unit) => {
    if (typeof unit.source === "string") {
      // Add to spans
      spans.push({
        ...unit,
        level: 0,
        path: "root",
        attributes: "",
      });

      return;
    }

    const sourceSpans = flattenGenericSpans(unit.source);

    sourceSpans.forEach((span) => {
      // Clone span as a new object called spanAttributes
      const spanAttributes = { ...span };

      // Unset content key from spanAttributes object
      delete spanAttributes.contents;
      delete spanAttributes.path;
      delete spanAttributes.level;

      spans.push({
        file: unit.file,
        unit: unit.unit,
        source: typeof span.contents === "string" ? span.contents : "",
        target: "",
        path: span.path,
        level: span.level,
        attributes: JSON.stringify(spanAttributes),
      });
    });
  });

  // Get all header cells
  const headers = new Set();

  spans.forEach((span) => {
    Object.keys(span).forEach((key) => {
      headers.add(key);
    });
  });

  // Convert spans to CSV
  const csv = papaparse.unparse({
    fields: Array.from(headers).sort((a, b) => {
      // If = "source" or "target" then sort to the back
      if (a === "source" || a === "target") {
        return 1;
      }

      if (b === "source" || b === "target") {
        return -1;
      }

      return 0;
    }),
    data: spans,
  });

  return csv;
};

/**
 *
 */
function setNestedProperty(obj, path, value) {
  const keys = path.split(".").reduce((acc, key) => {
    const arrayMatch = key.match(/([^\[]+)\[(\d+)\]/);
    if (arrayMatch) {
      acc.push(arrayMatch[1]);
      acc.push(parseInt(arrayMatch[2], 10));
    } else {
      acc.push(key);
    }
    return acc;
  }, []);

  let current = obj;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
    } else {
      if (!current[key]) {
        current[key] = typeof keys[index + 1] === "number" ? [] : {};
      }
      current = current[key];
    }
  });
}

/**
 * Convert CSV to JS
 */
const convertCsvToJs = (csvPath) => {
  const csvData = fs.readFileSync(csvPath, "utf8");

  const { data } = papaparse.parse(csvData, { header: true });

  const jsonResult = data.reduce((acc, { file, unit }) => {
    // If file isn't in the accumulator, add it
    if (!acc[file]) {
      acc[file] = {};
    }

    // If unit isn't in the file, add it
    if (!acc[file][unit]) {
      acc[file][unit] = { source: "", target: "" };
    }

    return acc;
  }, {});

  // return jsonResult;

  data.forEach((row) => {
    const { file, unit, path, attributes, source, target } = row;

    let newPath = path.replace(/root/, "");

    // Initialize the object at the fullPath

    const parsedAttributes = attributes !== "" ? JSON.parse(attributes) : null;

    if (!parsedAttributes || !Object.keys(parsedAttributes).length) {
      setNestedProperty(jsonResult, `${file}.${unit}.source${newPath}`, source);
      setNestedProperty(jsonResult, `${file}.${unit}.target${newPath}`, target);
      return;
    }

    // newPath = newPath.split(".");

    // newPath.pop();

    // newPath = newPath.join(".");

    const newSource = { ...parsedAttributes, contents: source };
    const newTarget = { ...parsedAttributes, contents: target };

    console.dir(newSource, { depth: null });
    console.dir(newTarget, { depth: null });

    setNestedProperty(
      jsonResult,
      `${file}.${unit}.source${newPath}`,
      newSource
    );

    setNestedProperty(
      jsonResult,
      `${file}.${unit}.target${newPath}`,
      newTarget
    );
  });

  return {
    sourceLanguage: "en-US",
    resources: jsonResult,
  };
};

module.exports = {
  convertXliffToJs,
  convertJsToXliff,
  convertXliff12ToJs,
  convertJsToXliff12,
  convertJsToCsv,
  convertCsvToJs,
};
