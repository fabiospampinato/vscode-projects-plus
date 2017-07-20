
/* IMPORT */

import * as _ from 'lodash';
import {fetchDirtyGit} from './git';

/* GENERAL */

async function fetchDirtyGeneral ( folderpath ) {

  const fetchers = [fetchDirtyGit];

  for ( let fetcher of fetchers ) {

    const result = await fetcher ( folderpath );

    if ( _.isBoolean ( result ) ) return result;

  }

  return false;

}

async function fetchDirtyGeneralMulti ( folderpaths ) {

  const multi = {};

  for ( let folderpath of folderpaths ) {

    multi[folderpath] = await fetchDirtyGeneral ( folderpath );

  }

  return multi;

}

/* EXPORT */

export {fetchDirtyGeneral, fetchDirtyGeneralMulti};
