const { Command, flags } = require('@oclif/command');
const fs = require('fs');
const path = require('path');
const objectId = require('objectid');

const beautifyName = (name) => name.replace(/^([а-я]) /, '$1. ');

class RussianCitiesCommand extends Command {
  static args = [
    {
      name: 'sourceDir',
      required: true,
      description: 'Directory containing OKTMO source files',
    },
  ];

  convertOktmo(sourceDir) {
    const regionsPath = path.join(sourceDir, './Regions.json');
    const oktmoPath = path.join(sourceDir, './Oktmo.json');

    const subjects = JSON.parse(
      fs.readFileSync(regionsPath, 'utf8').replace(/^\uFEFF/, '')
    )
      .map((s) => ({
        name: s.Name,
        oktmo: s.OKTMO_ID.toString(),
        id: s.ID,
        regions: [],
      }))
      .reduce((obj, item) => ((obj[item.id] = item), obj), {});

    let oktmo = JSON.parse(
      fs.readFileSync(oktmoPath, 'utf8').replace(/^\uFEFF/, '')
    );

    const regions = oktmo
      .filter((item) => item.Kod2.length === 8)
      .filter((item) => item.SubKod3 === '000' && item.SubKod2 !== '000')
      .reduce(
        (obj, item) => ((obj[item.SubKod1 + item.SubKod2] = item), obj),
        {}
      );

    Object.values(regions).forEach((region) => {
      const subject = subjects[region.RegionID];
      if (!subject) {
        throw new Error(`Can't find subject: ${region.RegionID}`);
      }
      region.localities = [];
      subject.regions.push(region);
    });

    oktmo
      .filter((item) => item.Kod2.length === 11)
      .filter(
        (item) =>
          item.SubKod2 !== '000' &&
          item.SubKod3 !== '000' &&
          item.SubKod4 !== '000'
      )
      .forEach((item) => {
        const region = regions[item.SubKod1 + item.SubKod2];
        if (!region) {
          console.log(item);
          throw new Error();
        }
        if (!region.localities) {
          region.localities = [];
        }
        item.name = beautifyName(item.Name2);
        region.localities.push(item);
      });

    return Object.values(subjects).map((subject) => ({
      name: subject.name,
      oktmo: subject.oktmo,
      regions: subject.regions.map((region) => ({
        name: region.Name2,
        oktmo: region.Kod2,
        localities: region.localities.map((locality) => ({
          name: locality.name,
          oktmo: locality.Kod2,
          fullName: `${subject.name}, ${
            region.Name2.startsWith('- ') ? '' : region.Name2 + ','
          } ${locality.name}`,
        })),
      })),
    }));
  }

  getWriteSteam(output) {
    if (!output) {
      return process.stdout;
    }
    return fs.createWriteStream(output, 'utf8');
  }

  convertToJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  convertToMongo(data) {
    const subjectsStream = fs.createWriteStream('mongo_subjects.json');
    const regionsStream = fs.createWriteStream('mongo_regions.json');
    const localitiesStream = fs.createWriteStream('mongo_localities.json');
    for (const subject of data) {
      const subjectId = { $oid: objectId().toString() };
      const subjectM = {
        _id: subjectId,
        name: subject.name,
        oktmo: subject.oktmo,
      };
      subjectsStream.write(JSON.stringify(subjectM) + '\n');
      for (const region of subject.regions) {
        const regionId = { $oid: objectId().toString() };
        const regionM = {
          _id: regionId,
          federalSubject: subjectId,
          name: region.name,
          oktmo: region.oktmo,
        };
        regionsStream.write(JSON.stringify(regionM) + '\n');
        for (const locality of region.localities) {
          const localityId = { $oid: objectId().toString() };
          const localityM = {
            _id: localityId,
            federalSubject: subjectId,
            region: regionId,
            name: locality.name,
            oktmo: locality.oktmo,
            fullName: locality.fullName,
          };
          localitiesStream.write(JSON.stringify(localityM) + '\n');
        }
      }
    }
  }

  async run() {
    const { args, flags } = this.parse(RussianCitiesCommand);
    const data = this.convertOktmo(args.sourceDir);
    switch (flags.format) {
      case 'json':
        const stream = this.getWriteSteam(flags.output);
        stream.write(this.convertToJSON(data));
        stream.close();
        break;
      case 'mongo':
        this.convertToMongo(data);
        break;
      default:
        throw new Error(`Unsupported format: ${flags.format}`);
    }
  }
}

RussianCitiesCommand.description = `Converts russian OKTMO source to hierarchy of subjects, regions and localities`;

RussianCitiesCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({ char: 'v' }),
  // add --help flag to show CLI version
  help: flags.help({ char: 'h' }),
  output: flags.string({ char: 'o', description: 'output file' }),
  format: flags.string({
    char: 'f',
    description: 'format',
    default: 'json',
    options: ['json', 'mongo'],
    required: true,
  }),
};

module.exports = RussianCitiesCommand;
