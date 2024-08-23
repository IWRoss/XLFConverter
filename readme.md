# How to use this script

This script is used to convert .xlf files (1.2 only) into .csv files and vice versa. It is a simple script that can be used to convert files in a batch.

## How to use

1. Clone the repository
2. Place the files you would like to convert in the `input` folder
3. Run the script with the following command:

```bash
npm run start:xliff2csv
```

or

```bash
npm run start:csv2xliff
```

4. The converted files will be placed in the `output` folder.

## CSV format

The CSV format is as follows:

1. _file_
2. _unit_
3. _level_: A number that represents the level of the span in the file
4. _path_: The path of the span in the file
5. _attributes_: A json object that contains the attributes of the span
6. _source_: The text content of the span
7. _target_: The translation of the span (empty if the file is being converted to CSV)

## Note

The script can only interpret CSV files that were initially created by the script.
