
/* IMPORT */

import * as path from 'path';
import Utils from '../../utils';
import {fetchNPMDescription} from './npm';

/* PATH */

async function fetchPathDescription ( folderPath ) {

  const fetchers = [fetchNPMDescription];

  for ( let fetcher of fetchers ) {

    const description = await fetcher ( folderPath );

    if ( description ) return description;

  }

}

/* EXPORT */

export {fetchPathDescription};
