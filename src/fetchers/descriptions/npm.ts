
/* IMPORT */

import * as _ from 'lodash';
import * as path from 'path';
import Utils from '../../utils';

/* NPM */

async function fetchNPMDescription ( folderpath ) {

  const manifestPath = path.join ( folderpath, 'package.json' ),
        manifestFile = Utils.file.readSync ( manifestPath );

  if ( !manifestFile ) return;

  const manifest = _.attempt ( JSON.parse, manifestFile );

  if ( _.isError ( manifest ) || !manifest.description ) return;

  return manifest.description;

}

/* EXPORT */

export {fetchNPMDescription};
